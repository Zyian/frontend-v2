import service from './service'
import store from '@/store'
import Console from "@/utils/Console";
/**
 * Object Life-cycle manager
 * Automatically fetch data when passed object's TTL
 */
class ObjectManager {
  /** Creates a manager
   *
   * @param {Object} api endpoint url that will be used to refresh the data from. the manager will send a GET request to the corresponding url
   * @param {Function[]} transform transform functions that will be called in sequence and will transform the object using the return value of the functions
   * @param {Function} validator validator shall validates the object and return Boolean to indicate if such object is valid or not
   * @param {number} ttl time-to-live (TTL), in milliseconds
   * @param {Object<Function, Function(Promise)>} ajaxHooks the first function will be called before sending the request, and the second function will be called after done receiving the request, with the request Promise as the argument
   */
  constructor({ name, api, transform, validator, ttl, ajaxHooks}) {
    this.name = name;
    this.api = api;
    this.transform = transform ? [...transform, o => o] : [o => o];
    this.validator = validator ? validator : () => true;
    this.ttl = ttl;
    this.ajaxHooks = ajaxHooks;
  }

  // private methods

  /**
   * sequentially transforms the object
   *
   * @private
   * @type {Object} data the object to be transform
   * @returns {Object} the transformed object
   */
  _transform (data) {
    let context = this;
    let current = data; // the current transform result
    for (let func of context.transform) {
      current = func(current) // transform the object by calling the function and refresh its result
    }
    return current
  }

  get server () {
    return store.getters["dataSource/server"]
  }

  /**
   * check the cache validity
   *
   * @returns {boolean} validity of the current cache
   */
  get cacheValid() {
    let cacheUpdateAt = store.getters['data/updated']({
      id: this.name,
      server: this.api.serverSensitive ? this.server : "_shared"
    })
    Console.debug("ObjectManager", "cache status of id:",
      this.name,
      "server:",
      this.server,
      "valid:",
      cacheUpdateAt + this.ttl > Date.now(),
      "updated:",
      cacheUpdateAt,
      "ttl:",
      this.ttl,
      "timeNow:",
      Date.now()
    );
    return cacheUpdateAt + this.ttl > Date.now()
  }

  get apiConfig () {
    let config = {
      method: "GET",
      url: this.api.url,
      params: {
        ...this.api.extraParams
      }
    };

    if (this.api.serverSensitive) config.params["server"] = this.server

    return config
  }

  /**
   * returns local cache if ttl has been fulfilled, and fetches external api when
   * the ttl of local cache is outdated or the local cache is not available
   *
   * @async
   * @param {boolean} forced equals true can skip tll check
   * @returns {Promise} the promise that resolves when refresh completed
   */
  async refresh(forced = false) {
    const context = this;

    Console.debug("ObjectManager",
      `${context.name}: requireAuthorization ${context.api.requireAuthorization}, authorized ${store.getters["auth/loggedIn"]}`)
    if (context.api.requireAuthorization && !store.getters["auth/loggedIn"]) {
      Console.info("ObjectManager",
        `skipped fetching ${context.name} due to requireAuthorization and !authorized.`)
      return store.commit("data/storeData", {
        name: context.name,
        value: [],
        server: this.api.serverSensitive ? context.server : "_shared"
      });
    }

    if (!forced && context.cacheValid) {
      // valid cache
      Console.debug("ObjectManager", "cache: valid. id:",
        this.name,
        "server:",
        this.server
      );
      return Promise.resolve();
    } else {
      // outdated cache, fetch api
      context.ajaxHooks.request(context.name);
      Console.debug("ObjectManager", `cache: invalid, fetching api. reason:`,
        forced ? '[Force Refresh]' : '[Cache Outdated]',
        "id:",
        this.name,
        "server:",
        this.server,
        "apiConfig:",
        context.apiConfig
      );

      const promise = new Promise((resolve, reject) => {
        service(context.apiConfig)
          .then(({ data }) => {
            data = context._transform(data);

            const validatorResponse = context.validator(data);

            console.log(context.name, this.validator, validatorResponse)

            if (validatorResponse !== true) {
              return reject({
                errorMessage: `Invalid structure: ${validatorResponse}`
              })
            }

            store.commit("data/storeData", {
              name: context.name,
              value: data,
              server: this.api.serverSensitive ? context.server : "_shared"
            });

            Console.info("ObjectManager", `fetched data "${context.name}" at ${Date.now()} for server "${context.server}"`);

            resolve(data)
          })
          .catch((err) => {
            console.log("ajax failed at service promise")
            reject(err)
          })
      })

      context.ajaxHooks.response(context.name, promise);
      return promise;
    }
  }
}


export default ObjectManager
