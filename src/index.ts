import axios from "axios";
import * as querystring from "querystring";
import * as moment from "moment";

export class VillageForecast {
  // LCC DFS 좌표변환을 위한 기초 자료
  static RE = 6371.00877; // 지구 반경(km)
  static GRID = 5.0; // 격자 간격(km)
  static SLAT1 = 30.0; // 투영 위도1(degree)
  static SLAT2 = 60.0; // 투영 위도2(degree)
  static OLON = 126.0; // 기준점 경도(degree)
  static OLAT = 38.0; // 기준점 위도(degree)
  static XO = 43; // 기준점 X좌표(GRID)
  static YO = 136; // 기준점 Y좌표(GRID)
  static baseURL = "http://apis.data.go.kr/1360000/VilageFcstInfoService";

  private serviceKey = null;

  setServiceKey(src) {
    this.serviceKey = src;
  }

  parseRawResponse(rawResponse): RawResponse {
    const res: RawResponse = rawResponse["response"];
    const { header } = res;
    const { resultCode, resultMsg } = header;
    if (resultCode !== "00") {
      return null;
    }
    return res;
  }

  parseItemRow(item: RawItem): WeatherItem {
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

  // 1. 초단기실황조회
  async getUltraSrtNcst(
    lat: number,
    lng: number,
    datetime?,
    numOfRows = 1024,
    pageNo = 1
  ): Promise<NCastResult> {
    // 6시 발표(정시단위) -매시각 40분 이후 호출
    let baseDatetime: moment.Moment = null;
    if (!datetime) {
      baseDatetime = moment();
      if (baseDatetime.minutes() < 40) {
        baseDatetime.subtract(1, "hour");
      }
    } else {
      baseDatetime = moment(datetime);
    }
    const { nx, ny } = this.latLngToGrid(lat, lng);

    const params = {
      serviceKey: this.serviceKey,
      pageNo: pageNo,
      numOfRows: numOfRows,
      dataType: "JSON",
      base_date: baseDatetime.format("YYYYMMDD"),
      base_time: baseDatetime.format("HHmm"),
      nx: nx,
      ny: ny,
    };
    const qs = querystring.stringify(params);

    const url = `${VillageForecast.baseURL}/getUltraSrtNcst?${qs}`;
    const rawResponse = await axios.get(url);
    const { body } = this.parseRawResponse(rawResponse.data);

    const result = body.items.item.reduce(
      (result, item) => {
        if (!result.baseDate) {
          result.baseDate = moment(`${item.baseDate} ${item.baseTime}`).format(
            "YYYY-MM-DD HH:mm"
          );
        }
        const row = this.parseItemRow(item);
        result.items.push(row);
        return result;
      },
      {
        url: url,
        baseDate: null,
        items: [],
      }
    );

    return result;
  }

  // 2.초단기예보
  async getUltraSrtFcst(
    lat: number,
    lng: number,
    datetime?,
    numOfRows = 1024,
    pageNo = 1
  ): Promise<FCastResult> {
    let baseDatetime: moment.Moment = null;
    if (!datetime) {
      baseDatetime = moment();
      if (baseDatetime.minutes() < 45) {
        baseDatetime.subtract(1, "hour");
      }
    } else {
      baseDatetime = moment(datetime);
    }
    const { nx, ny } = this.latLngToGrid(lat, lng);

    const params = {
      serviceKey: this.serviceKey,
      pageNo: pageNo,
      numOfRows: numOfRows,
      dataType: "JSON",
      base_date: baseDatetime.format("YYYYMMDD"),
      base_time: baseDatetime.format("HHmm"),
      nx: nx,
      ny: ny,
    };
    const qs = querystring.stringify(params);

    const url = `${VillageForecast.baseURL}/getUltraSrtFcst?${qs}`;

    const rawResponse = await axios.get(url);

    const { header, body } = this.parseRawResponse(rawResponse.data);

    const result = body.items.item.reduce(
      (result, item) => {
        if (!result.baseDate) {
          result.baseDate = moment(`${item.baseDate} ${item.baseTime}`).format(
            "YYYY-MM-DD HH:mm"
          );
        }
        const key = item.fcstDate + item.fcstTime;
        if (!result.forecastDate[key]) {
          result.forecastDate[key] = [];
        }
        const row = this.parseItemRow(item);
        result.forecastDate[key].push(row);
        return result;
      },
      {
        url: url,
        baseDate: null,
        forecastDate: [],
      }
    );

    result.forecastDate = Object.entries(result.forecastDate).reduce(
      (result, [k, v]) => {
        const newRow = {
          date: moment(k, "YYYYMMDDHHmm").format("YYYY-MM-DD HH:mm"),
          items: v,
        };
        result.push(newRow);
        return result;
      },
      []
    );

    return result;
  }

  // 3. 동네예보조회
  async getVilageFcst(
    lat: number,
    lng: number,
    datetime?,
    numOfRows = 1024,
    pageNo = 1
  ): Promise<FCastResult> {
    let baseDatetime: moment.Moment = null;
    if (!datetime) {
      baseDatetime = moment();
      // TODO
    } else {
      baseDatetime = moment(datetime);
    }

    const { nx, ny } = this.latLngToGrid(lat, lng);

    const params = {
      serviceKey: this.serviceKey,
      pageNo: pageNo,
      numOfRows: numOfRows,
      dataType: "JSON",
      base_date: baseDatetime.format("YYYYMMDD"),
      base_time: baseDatetime.format("HHmm"),
      nx: nx,
      ny: ny,
    };
    const qs = querystring.stringify(params);

    const url = `${VillageForecast.baseURL}/getVilageFcst?${qs}`;

    const rawResponse = await axios.get(url);

    const { body } = this.parseRawResponse(rawResponse.data);

    const result = body.items.item.reduce(
      (result, item) => {
        if (!result.baseDate) {
          result.baseDate = moment(`${item.baseDate} ${item.baseTime}`).format(
            "YYYY-MM-DD HH:mm"
          );
        }
        const key = item.fcstDate + item.fcstTime;
        if (!result.forecastDate[key]) {
          result.forecastDate[key] = [];
        }
        const row = this.parseItemRow(item);
        result.forecastDate[key].push(row);
        return result;
      },
      {
        url: url,
        baseDate: null,
        forecastDate: [],
      }
    );

    result.forecastDate = Object.entries(result.forecastDate).reduce(
      (result, [k, v]) => {
        const newRow = {
          date: moment(k, "YYYYMMDDHHmm").format("YYYY-MM-DD HH:mm"),
          items: v,
        };
        result.push(newRow);
        return result;
      },
      []
    );

    return result;
  }

  // 4. 동네예보조회
  async getFcstVersion(
    type: "ODAM" | "VSRT" | "SHRT",
    numOfRows = 1024,
    pageNo = 1
  ) {
    const params = {
      serviceKey: this.serviceKey,
      pageNo: pageNo,
      numOfRows: numOfRows,
      dataType: "JSON",
      ftype: type,
      basedatetime: moment().format("YYYYMMDDHHmm"),
    };
    const qs = querystring.stringify(params);

    const url = `${VillageForecast.baseURL}/getFcstVersion?${qs}`;

    const rawResponse = await axios.get(url);
    return rawResponse.data;
  }

  // LCC DFS 좌표변환 ( 위경도->좌표(grid) )
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

  // LCC DFS 좌표변환 ( 좌표(grid)->위경도 )
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

export interface RawItem {
  baseDate: string;
  baseTime: string;
  category: string;
  nx: number;
  ny: number;
  obsrValue: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
}

export interface RawBody {
  dataType: "JSON" | "XML";
  items: {
    item: RawItem[];
  };
  pageNo: number;
  numOfRows: number;
  totalCount: number;
}

export interface RawHeader {
  resultCode: string;
  resultMsg: string;
}

export interface RawResponse {
  header: RawHeader;
  body: RawBody;
}

export interface WeatherItem {
  category: string;
  value: string;
  desc: string;
  valueDesc?: string;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface WeatherGrid {
  nx: number;
  ny: number;
}

export interface NCastResult {
  url: string;
  baseDate: string;
  items: WeatherItem[];
}

export interface FCastResult {
  url: string;
  baseDate: string;
  forecastDate: FCastResultDate[];
}

export interface FCastResultDate {
  date: string;
  items: WeatherItem[];
}
