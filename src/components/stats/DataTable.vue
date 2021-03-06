<i18n>
{
	"en": {
		"scroll": "Scroll to view details"
	},
	"ja": {
		"scroll": "左右にスクロールでデータを表示"
	},
	"ko": {
		"scroll": "스크롤로 세부 사항을 볼 수 있습니다"
	},
	"zh": {
		"scroll": "左右滑动查看数据"
	}
}
</i18n>

<template>
  <!-- This `fix-position` thing is actually for preventing unauthorized usage of the devtools. -->
  <!-- Yeah I know this is not useful I know, but 99% of the time, that the one who do the copy/pastie jobs and not -->
  <!-- attributing us won't be clever to the point to disable this class. If they are this clever, they would use -->
  <!-- our api to get clean and most up-to-date data instead of trying to sneak into our web page. ;) -->
  <div :class="{'stat-table-fix-position': !$store.getters['auth/loggedIn']}">
    <v-row
      v-if="$vuetify.breakpoint.xsOnly"
      align="center"
      justify="center"
      class="mt-1 mb-3"
    >
      <span
        class="caption grey--text"
      >
        <v-icon
          small
          color="grey"
          class="scroll-chevron-left mr-1"
        >
          mdi-chevron-double-left
        </v-icon>

        <span
          class="scroll-keyword"
        >{{ $t('scroll') }}</span>

        <v-icon
          small
          color="grey"
          class="scroll-chevron-right ml-1"
        >
          mdi-chevron-double-right
        </v-icon>
      </span>
    </v-row>

    <div class="stat-table-watermark d-flex align-center justify-start flex-column text-center px-4">
      <h1 :class="{'display-2 mb-4': !$vuetify.breakpoint.smAndUp, 'display-3 mb-6': $vuetify.breakpoint.smAndUp}">
        {{ currentMirrorHostname }}
      </h1>
      <span :class="{'display-1': !$vuetify.breakpoint.smAndUp, 'display-2': $vuetify.breakpoint.smAndUp}">
        {{ $t('app.name') }}
      </span>
    </div>

    <v-data-table
      :headers="headers"
      :items="items"
      :search="search"
      :options="options.table"
      :footer-props="options.footer"

      must-sort
      sort-by="percentage"
      :sort-desc="true"
      :locale="$i18n.locale"
      :hide-default-footer="items.length <= 10"

      :calculate-widths="true"
      :mobile-breakpoint="1"
      :loading="matrixPending"

      :class="{'elevation-0 transparentTable stat-table container--fluid px-2': true, 'pt-0': $vuetify.breakpoint.xsOnly}"
    >
      <template v-slot:item="props">
        <tr>
          <template v-if="type === 'stage'">
            <td
              :class="{
                'item-name-td-xs': $vuetify.breakpoint.xsOnly,
                'item-name-td-sm': $vuetify.breakpoint.smOnly
              }"
            >
              <v-row
                align="center"
                class="cursor-pointer item-name pl-1"
                @click="redirectItem(props.item.item.itemId)"
              >
                <Item
                  :item="props.item.item"
                  :ratio="0.6"
                  disable-tooltip
                  disable-link

                  class="item-icon"
                />
                <span
                  style="padding-left: 44px"
                  class="item-name--text"
                >
                  {{ strings.translate(props.item.item, "name") }}
                </span>
                <v-icon
                  x-small
                  class="ml-1 item-name--chevron"
                >
                  mdi-link
                </v-icon>
                <v-divider
                  class="mx-4 item-name--line"
                />
              </v-row>
            </td>
          </template>
          <template v-else>
            <td
              :class="{
                'item-name-td-xs': $vuetify.breakpoint.xsOnly,
                'item-name-td-sm': $vuetify.breakpoint.smOnly
              }"
            >
              <v-row
                align="center"
                class="cursor-pointer item-name"
                @click="redirectStage(props.item.stage.stageId)"
              >
                <v-icon>{{ props.item.zone.icon }}</v-icon>
                <span
                  class="ml-2"
                >
                  {{ strings.translate(props.item.stage, "code") }}
                </span>
                <v-icon
                  x-small
                  class="ml-1 item-name--chevron"
                >
                  mdi-link
                </v-icon>
                <v-divider
                  class="mx-4 item-name--line"
                />
              </v-row>
            </td>
            <td
              :class="`${tableCellClasses} yellow--text ${dark ? '' : 'text--darken-3'}`"
            >
              {{ props.item.stage.apCost }}
            </td>
          </template>
          <td
            :class="tableCellClasses"
          >
            {{ props.item.quantity }}
          </td>
          <td
            :class="tableCellClasses"
          >
            {{ props.item.times }}
          </td>
          <td
            class="d-flex align-center justify-start fill-height"
            :class="tableCellClasses"
          >
            <span class="mr-2">
              {{ props.item.percentageText }}
            </span>

            <Charts
              v-if="trends"
              :interval="trends && trends.interval"
              :x-start="trends && getTrendsData(props).startTime"
              :show-dialog="expandTrends"
              :data-keys="['quantity']"
              :data="getTrendsData(props).results"
              :charts-id="chartId(props)"
              sparkline-key="quantity"
              sparkline-sub-key="times"

              :meta="meta(props)"
            />
          </td>
          <td
            :class="tableCellClasses"
          >
            {{ props.item.apPPR }}
          </td>
          <td
            :class="tableCellClasses"
          >
            {{ formatDate(props.item) }}
          </td>
        </tr>
      </template>
      <!--          <template v-slot:item.percentage="{item}">-->
      <!--            <span class="px-0">-->
      <!--              {{ item.percentageText }}-->
      <!--            </span>-->
      <!--          </template>-->
    </v-data-table>
  </div>
</template>

<script>
  import strings from "@/utils/strings";
  import get from "@/utils/getters";
  import Item from "@/components/global/Item";
  import {mapGetters} from "vuex";
  import Theme from "@/mixins/Theme";
  import Charts from "@/components/stats/Charts";
  import timeFormatter from "@/utils/timeFormatter";
  import CDN from "@/mixins/CDN";
  import Mirror from "@/mixins/Mirror";

  export default {
    name: "DataTable",
    components: {Item, Charts},
    mixins: [Theme, CDN, Mirror],
    props: {
      items: {
        type: Array,
        required: true
      },
      search: {
        type: String,
        default () {
          return ""
        }
      },
      type: {
        type: String,
        required: true,
        validator (val) {
          return ['item', 'stage'].includes(val)
        }
      },
      trends: {
        type: Object,
        default () {
          return null
        }
      }
    },
    data() {
      return {
        options: {
          table: {
            itemsPerPage: 20
          },
          footer: {
            itemsPerPageOptions: [10, 20, 40, -1],
            showCurrentPage: true
          }
        },
        tableCellClasses: "px-2 font-weight-bold monospace",
        hideItemName: false,
        expandTrends: false
      }
    },
    computed: {
      ...mapGetters('ajax', ['matrixPending']),
      headers() {
        const headers = [
          {
            text: this.$t("stats.headers.quantity"),
            value: "quantity",
            align: "left",
            sortable: true,
            width: "85px"
          },
          {
            text: this.$t("stats.headers.times"),
            value: "times",
            align: "left",
            sortable: true,
            width: "85px"
          },
          {
            text: this.$t("stats.headers.percentage"),
            value: "percentage",
            align: "left",
            sortable: true,
            width: "100px"
          },
          {
            text: this.$t("stats.headers.apPPR"),
            value: "apPPR",
            align: "left",
            sortable: true,
            width: "110px"
          },
          {
            text: this.$t("stats.headers.timeRange"),
            value: "timeRange",
            align: "left",
            sortable: false,
            width: "140px"
          }
        ];

        if (this.type === "stage") {
          headers.unshift({
            text: this.$t("stats.headers.item"),
            value: "icon",
            align: "left",
            sortable: false,
            width: "250px"
          });
        } else {
          headers.unshift({
              text: this.$t("stats.headers.stage"),
              value: "stage",
              align: "left",
              sortable: false,
              width: "230px"
            },
            {
              text: this.$t("stats.headers.apCost"),
              value: "stage.apCost",
              align: "left",
              sortable: true,
              width: "70px"
            })
        }

        return headers
      },
      strings () {
        return strings
      }
    },
    created () {
      document.addEventListener('copy', this.manipulateCopy);
    },
    beforeDestroy() {
      document.removeEventListener('copy', this.manipulateCopy)
    },
    methods: {
      manipulateCopy(event) {
        const extra = this.$t('meta.copyWarning', {site: document.location.href});
        event.clipboardData.setData('text', document.getSelection() + extra);
        event.preventDefault();
      },
      getTrendsData(props) {
        if (this.type === "stage") {
          if (this.trends && this.trends.results && this.trends.results[props.item.item.itemId]) {
            return {
              results: this.trends.results[props.item.item.itemId],
              startTime: this.trends.startTime
            }
          }
        } else {
          if (this.trends && props.item.stage.stageId in this.trends) {
            return this.trends[props.item.stage.stageId]
          }
        }
        return false
      },
      redirectItem(itemId) {
        this.$router.push({
          name: "StatsByItem_SelectedItem",
          params: {
            itemId
          }
        });
      },
      redirectStage(stageId) {
        const got = get.stages.byStageId(stageId);
        this.$router.push({
          name: "StatsByStage_Selected",
          params: {
            zoneId: got.zoneId,
            stageId
          }
        });
      },
      chartId (rowProps) {
        if (this.type === "stage") {
          return rowProps.item.item.itemId
        } else {
          return rowProps.item.stage.stageId
        }
      },
      meta (rowProps) {
        if (this.type === "stage") {
          return {
            name: strings.translate(rowProps.item.item, "name")
          }
        } else {
          return {
            name: strings.translate(rowProps.item.stage, "code")
          }
        }
      },
      formatDate (item) {
        const start = item.start
        const end = item.end

        return timeFormatter.startEnd(start, end)
      }
    },
  }
</script>

<style>

</style>