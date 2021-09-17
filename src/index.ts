import axios from "axios";
import * as moment from "moment";
import {
  FCastResult,
  HTTPFetchResult,
  Location,
  NCastResult,
  RawItem,
  RawResponse,
  WeatherGrid,
  WeatherItem,
} from "./interface";

export class VillageForecast {
  static RE = 6371.00877;
  static GRID = 5.0;
  static SLAT1 = 30.0;
  static SLAT2 = 60.0; // 투영 위도2(degree)
  static OLON = 126.0; // 기준점 경도(degree)
  static OLAT = 38.0; // 기준점 위도(degree)
  static XO = 43; // 기준점 X좌표(GRID)
  static YO = 136; // 기준점 Y좌표(GRID)
  static baseURL = "http://apis.data.go.kr/1360000/VilageFcstInfoService";

  private timeout;
  private serviceKey;
  private showOrigin;

  /**
   * 기초 데이터 셋업
   * @param {string} ServiceKey 부여 받은 서비스 키
   * @param {number} timeout 기상청 통신 타임아웃 (기본값: 2000ms)
   * @param {boolean} showOrigin 원본 데이터 표시 여부
   */
  constructor(param: {
    serviceKey: string;
    timeout?: number;
    showOrigin?: boolean;
  }) {
    const { serviceKey, timeout = 2000, showOrigin = false } = param;
    this.serviceKey = serviceKey;
    this.timeout = timeout;
    this.showOrigin = showOrigin;
  }

  private parseRawResponse(rawResponse): RawResponse {
    if (!rawResponse["response"]) {
      throw new Error("response 데이터가 잘못되었습니다.");
    }
    const res: RawResponse = rawResponse["response"];
    const { header } = res;
    const { resultCode, resultMsg } = header;
    if (resultCode !== "00") {
      throw new Error(`[${resultCode}]:[${resultMsg}]`);
    }
    return res;
  }

  private parseItemRow(item: RawItem): WeatherItem {
    const value = item.obsrValue ? item.obsrValue : item.fcstValue;
    const row = {
      category: item.category,
      value: value,
      desc: MapWeatherCategory[item.category],
    };
    if (item.category === "PTY") {
      row["valueDesc"] = MapWeatherCodePTY[value];
    }
    if (item.category === "SKY") {
      row["valueDesc"] = MapWeatherCodeSKY[value];
    }
    if (item.category === "VEC") {
      const vecValue = Number(value);
      row["valueDesc"] = MapWindDirection[Math.floor((vecValue % 360) / 45)];
    }
    return row;
  }

  private async fetch(input: {
    path: string;
    params: Record<string, string | number>;
  }): Promise<HTTPFetchResult> {
    if (!this.serviceKey) {
      throw new Error("key가 없습니다.");
    }
    const qs = new URLSearchParams({
      serviceKey: this.serviceKey,
      dataType: "JSON",
    });
    for (const [k, v] of Object.entries(input.params)) {
      qs.set(k, v.toString());
    }
    const url = `${VillageForecast.baseURL}/${input.path}?${qs}`;
    return {
      url: url,
      response: await axios.get(url, {
        timeout: this.timeout,
      }),
    };
  }

  getBaseTime(param: { src: string; minute?: number }): moment.Moment {
    const { src, minute } = param;
    let current = moment(src);
    if (minute === undefined) {
      return current;
    }

    // 발표기준 "분"이 지나지 않았으므로 한시간 전 데이터 조회
    if (moment().isSame(moment(src), "h") && moment(src).minutes() < minute) {
      current = current.subtract(1, "hour");
    }

    return current;
  }

  /**
   * @description 초단기실황조회 - 실황정보를 조회하기 위해 발표일자, 발표시각, 예보지점 X 좌표, 예보지점 Y 좌표의 조회 조건으로 자료구분코드, 실황값, 발표일자, 발표시각, 예보지점 X 좌표, 예보지점 Y 좌표의 정보를 조회하는 기능
   * @param {string}  lat 위도
   * @param {string=} lng 경도
   * @param {string} datetime 조회 기준 시간
   * @param {number} [numOfRows="1024"] 조회 row 수
   * @return {NCastResult} URL, 조회 기준 시간, 데이터, 원본
   */
  public async getUltraSrtNcst(param: {
    lat: number;
    lng: number;
    datetime?: string;
    numOfRows?: number;
    pageNo?: number;
  }): Promise<NCastResult> {
    try {
      const { lat, lng, datetime, numOfRows = 1024, pageNo = 1 } = param;
      const baseDatetime = this.getBaseTime({
        src: datetime,
        minute: 40,
      });
      const { nx, ny } = this.latLngToGrid(lat, lng);

      const { url, response } = await this.fetch({
        path: "getUltraSrtNcst",
        params: {
          serviceKey: this.serviceKey,
          pageNo: pageNo,
          numOfRows: numOfRows,
          base_date: baseDatetime.format("YYYYMMDD"),
          base_time: baseDatetime.format("HHmm"),
          nx: nx,
          ny: ny,
        },
      });

      const { body } = this.parseRawResponse(response.data);
      const [firstItem] = body.items.item;
      const baseDate = moment(
        `${firstItem.baseDate} ${firstItem.baseTime}`,
      ).format("YYYY-MM-DD HH:mm");

      const items = body.items.item.reduce((result, item) => {
        const row = this.parseItemRow(item);
        result.push(row);
        return result;
      }, []);

      return {
        url: url,
        baseDate: baseDate,
        items: items,
        origin: this.showOrigin ? response.data : null,
      };
    } catch (e) {
      console.log(e.stack);
      return null;
    }
  }

  /**
   * @description 초단기예보조회 - 초단기예보정보를 조회하기 위해 발표일자, 발표시각, 예보지점 X 좌표, 예보지점 Y 좌표의 조회 조건으로 자료구분코드, 예보값, 발표일자, 발표시각, 예보지점 X 좌표, 예보지점 Y 좌표의 정보를 조회하는 기능
   * @param {string}  lat 위도
   * @param {string=} lng 경도
   * @param {string} datetime 조회 기준 시간
   * @param {number} [numOfRows="1024"] 조회 row 수
   * @return {FCastResult} URL, 조회 기준 시간, 데이터, 원본
   */
  public async getUltraSrtFcst(param: {
    lat: number;
    lng: number;
    datetime?: string;
    numOfRows?: number;
    pageNo?: number;
  }): Promise<FCastResult> {
    try {
      const { lat, lng, datetime, numOfRows = 1024, pageNo = 1 } = param;

      const baseDatetime = this.getBaseTime({
        src: datetime,
        minute: 45,
      });
      const { nx, ny } = this.latLngToGrid(lat, lng);

      const { url, response } = await this.fetch({
        path: "getUltraSrtFcst",
        params: {
          serviceKey: this.serviceKey,
          pageNo: pageNo,
          numOfRows: numOfRows,
          base_date: baseDatetime.format("YYYYMMDD"),
          base_time: baseDatetime.format("HHmm"),
          nx: nx,
          ny: ny,
        },
      });

      const { body } = this.parseRawResponse(response.data);
      const [firstItem] = body.items.item;
      const baseDate = moment(
        `${firstItem.baseDate} ${firstItem.baseTime}`,
      ).format("YYYY-MM-DD HH:mm");

      const forecasts = body.items.item.reduce((result, item) => {
        const forecastDate = moment(`${item.fcstDate} ${item.fcstTime}`).format(
          "YYYY-MM-DD HH:mm",
        );
        if (!result[forecastDate]) {
          result[forecastDate] = [];
        }
        const row = this.parseItemRow(item);
        result[forecastDate].push(row);
        return result;
      }, []);

      return {
        url: url,
        baseDate: baseDate,
        forecasts: forecasts,
        origin: this.showOrigin ? response.data : null,
      };
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  /**
   * @description 동네예보조회 - 동네예보 정보를 조회하기 위해 발표일자, 발표시각, 예보지점 X좌표, 예보지점 Y 좌표의 조회 조건으로 발표일자, 발표시각, 자료구분문자, 예보 값, 예보일자, 예보시각, 예보지점 X 좌표, 예보지점 Y 좌표의 정보를 조회하는 기능
   * @param {string}  lat 위도
   * @param {string=} lng 경도
   * @param {string} datetime 조회 기준 시간
   * @param {number} [numOfRows="1024"] 조회 row 수
   * @return {FCastResult} URL, 조회 기준 시간, 데이터, 원본
   */
  async getVilageFcst(param: {
    lat: number;
    lng: number;
    datetime?: string;
    numOfRows?: number;
    pageNo?: number;
  }): Promise<FCastResult> {
    const { lat, lng, datetime, numOfRows = 1024, pageNo = 1 } = param;

    const baseDatetime = this.getBaseTime({
      src: datetime,
    });
    const { nx, ny } = this.latLngToGrid(lat, lng);

    const { url, response } = await this.fetch({
      path: "getVilageFcst",
      params: {
        serviceKey: this.serviceKey,
        pageNo: pageNo,
        numOfRows: numOfRows,
        base_date: baseDatetime.format("YYYYMMDD"),
        base_time: baseDatetime.format("HHmm"),
        nx: nx,
        ny: ny,
      },
    });

    const { body } = this.parseRawResponse(response.data);
    const [firstItem] = body.items.item;
    const baseDate = moment(
      `${firstItem.baseDate} ${firstItem.baseTime}`,
    ).format("YYYY-MM-DD HH:mm");

    const forecasts = body.items.item.reduce((result, item) => {
      const forecastDate = moment(`${item.fcstDate} ${item.fcstTime}`).format(
        "YYYY-MM-DD HH:mm",
      );
      if (!result[forecastDate]) {
        result[forecastDate] = [];
      }
      const row = this.parseItemRow(item);
      result[forecastDate].push(row);
      return result;
    }, []);

    return {
      url: url,
      baseDate: baseDate,
      forecasts: forecasts,
      origin: this.showOrigin ? response.data : null,
    };
  }

  /**
   * @description 예보버전조회 - 동네예보정보조회서비스 각각의 오퍼레이션(초단기실황, 초단기예보, 동네예보)들의 수정된 예보 버전을 파악하기 위해 예보버전을 조회하는 기능
   * @param {string}  type 파일구분 (ODAM:동네예보실황, VSRT:동네예보초단기, SHRT:돈에예보단기)
   * @param {string=} lng 경도
   * @param {string} datetime 조회 기준 시간
   * @param {number} [numOfRows="1024"] 조회 row 수
   */
  async getFcstVersion(param: {
    type: "ODAM" | "VSRT" | "SHRT";
    datetime?: string;
    numOfRows?: number;
    pageNo?: number;
  }) {
    const { type, datetime, numOfRows = 1024, pageNo = 1 } = param;

    const { url, response } = await this.fetch({
      path: "getFcstVersion",
      params: {
        pageNo: pageNo,
        numOfRows: numOfRows,
        ftype: type,
        basedatetime: moment(datetime).format("YYYYMMDDHHmm"),
      },
    });

    const { body } = this.parseRawResponse(response.data);
    const [firstItem] = body.items.item;

    return {
      url: url,
      result: firstItem,
      origin: this.showOrigin ? response.data : null,
    };
  }

  /**
   * @description LCC DFS 좌표변환 - 위경도->좌표(grid), 일반적인 위경도로부터 기상청에서 사용하는 grid 단위의 x,y 좌표를 얻습니다.
   * @param {number} lat 경도
   * @param {number} lng 위도
   * @return nx, ny
   */
  latLngToGrid(lat: number, lng: number): WeatherGrid {
    const { PI, tan, log, cos, pow, floor, sin, sqrt, atan, abs, atan2 } = Math;
    const DEGRAD = Math.PI / 180.0;
    const RADDEG = 180.0 / Math.PI;

    const re = VillageForecast.RE / VillageForecast.GRID;
    const slat1 = VillageForecast.SLAT1 * DEGRAD;
    const slat2 = VillageForecast.SLAT2 * DEGRAD;
    const olon = VillageForecast.OLON * DEGRAD;
    const olat = VillageForecast.OLAT * DEGRAD;

    const rs: WeatherGrid = {
      nx: null,
      ny: null,
    };
    let theta;
    let ra;

    let sn = tan(PI * 0.25 + slat2 * 0.5) / tan(PI * 0.25 + slat1 * 0.5);
    sn = log(cos(slat1) / cos(slat2)) / log(sn);
    let sf = tan(PI * 0.25 + slat1 * 0.5);
    sf = (pow(sf, sn) * cos(slat1)) / sn;
    let ro = tan(PI * 0.25 + olat * 0.5);
    ro = (re * sf) / pow(ro, sn);

    ra = tan(PI * 0.25 + lat * DEGRAD * 0.5);
    ra = (re * sf) / pow(ra, sn);
    theta = lng * DEGRAD - olon;
    if (theta > PI) theta -= 2.0 * PI;
    if (theta < -PI) theta += 2.0 * PI;
    theta *= sn;
    rs.nx = floor(ra * sin(theta) + VillageForecast.XO + 0.5);
    rs.ny = floor(ro - ra * cos(theta) + VillageForecast.YO + 0.5);
    return rs;
  }

  /**
   * @description LCC DFS 좌표변환 ( 좌표(grid)->위경도 ), 기상청에서 사용하는 grid 단위의 x,y 좌표로부터 위경도를 얻습니다.
   * @param {number} lat 경도
   * @param {number} lng 위도
   * @return nx, ny
   */
  gridToLatLng(nx: number, ny: number): Location {
    const { PI, tan, log, cos, pow, floor, sin, sqrt, atan, abs, atan2 } = Math;
    const DEGRAD = PI / 180.0;
    const RADDEG = 180.0 / PI;

    const re = VillageForecast.RE / VillageForecast.GRID;
    const slat1 = VillageForecast.SLAT1 * DEGRAD;
    const slat2 = VillageForecast.SLAT2 * DEGRAD;
    const olon = VillageForecast.OLON * DEGRAD;
    const olat = VillageForecast.OLAT * DEGRAD;

    const rs: Location = {
      lat: null,
      lng: null,
    };
    let theta;
    let ra;

    let sn = tan(PI * 0.25 + slat2 * 0.5) / tan(PI * 0.25 + slat1 * 0.5);
    sn = log(cos(slat1) / cos(slat2)) / log(sn);
    let sf = tan(PI * 0.25 + slat1 * 0.5);
    sf = (pow(sf, sn) * cos(slat1)) / sn;
    let ro = tan(PI * 0.25 + olat * 0.5);
    ro = (re * sf) / pow(ro, sn);

    let xn = nx - VillageForecast.XO;
    let yn = ro - ny + VillageForecast.YO;
    ra = sqrt(xn * xn + yn * yn);
    if (sn < 0.0) -ra;
    let alat = pow((re * sf) / ra, 1.0 / sn);
    alat = 2.0 * atan(alat) - PI * 0.5;

    if (abs(xn) <= 0.0) {
      theta = 0.0;
    } else {
      if (abs(yn) <= 0.0) {
        theta = PI * 0.5;
        if (xn < 0.0) -theta;
      } else theta = atan2(xn, yn);
    }
    let alon = theta / sn + olon;
    rs.lat = alat * RADDEG;
    rs.lng = alon * RADDEG;
    return rs;
  }
}

export const MapWeatherCategory = {
  POP: "강수확률(%)",
  R06: "6시간 강수량(mm)",
  S06: "6시간 신적설(cm)",
  T3H: "3시간 기온(c)",
  TMN: "아침 최저기온(c)",
  TMX: "낮 최고기온(c)",
  WAV: "파고(M)",
  T1H: "기온(c)",
  RN1: "1시간 강수량(mm)",
  SKY: "하늘상태",
  UUU: "풍속(동서성분)",
  VVV: "풍속(남북성분)",
  REH: "습도(%)",
  PTY: "강수형태",
  LGT: "낙뢰",
  VEC: "풍향(deg)",
  WSD: "풍속(m/s)",
};

export const MapWeatherCodeSKY = {
  "1": "맑음",
  "2": "구름조금", // 삭제 (2019.06.4)
  "3": "구름많음",
  "4": "흐림",
};

export const MapWeatherCodePTY = {
  "0": "없음",
  "1": "비",
  "2": "비/눈",
  "3": "눈",
  "4": "소나기",
  "5": "빗방울",
  "6": "빗방울/눈날림",
  "7": "눈날림",
};

export const MapWindDirection = [
  "N-NE",
  "NE-E",
  "E-SE",
  "SE-S",
  "S-SW",
  "SW-W",
  "W-NW",
  "NW-N",
];
export type {
  FCastResult,
  HTTPFetchResult,
  Location,
  NCastResult,
  RawItem,
  RawResponse,
  WeatherGrid,
  WeatherItem,
};
