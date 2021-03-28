import axios from "axios";
import * as querystring from 'querystring';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';

export enum WeatherCategory {
    POP,
    R06,
    S06,
    T3H,
    TMN,
    TMX,
    WAV,
    T1H,
    RN1,
    SKY,
    UUU,
    VVV,
    REH,
    PTY,
    LGT,
    VEC,
    WSD,
}

// SKY

// - 하늘상태(SKY) 코드 : 맑음(1), 구름많음(3), 흐림(4) 
// * 구름조금(2) 삭제 (2019.06.4)
// - 강수형태(PTY) 코드 : 없음(0), 비(1), 비/눈(2), 눈(3), 소나기(4), 빗방울(5), 빗방울/눈날림(6), 눈날림(7)
// 여기서 비/눈은 비와 눈이 섞여 오는 것을 의미 (진눈개비)
// * 빗방울(5), 빗방울/눈날림(6), 눈날림(7) 


export class VillageForecast {
    // LCC DFS 좌표변환을 위한 기초 자료
    static RE = 6371.00877; // 지구 반경(km)
    static GRID = 5.0;      // 격자 간격(km)
    static SLAT1 = 30.0;    // 투영 위도1(degree)
    static SLAT2 = 60.0;    // 투영 위도2(degree)
    static OLON = 126.0;    // 기준점 경도(degree)
    static OLAT = 38.0;     // 기준점 위도(degree)
    static XO = 43;         // 기준점 X좌표(GRID)
    static YO = 136;        // 기준점 Y좌표(GRID)
    static baseURL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService'

    private serviceKey = null;

    setServiceKey(src) {
        this.serviceKey = src;
    }

    // getUltraSrtNcst
    // getUltraSrtFcst
    // getVilageFcst
    // getFcstVersion

    async fetchPractice() {
        const rawResponse = await fs.readFileSync(path.join(__dirname, '../examples/success01.json'));
        const parsedResponse = JSON.parse(rawResponse.toString());
        if (!parsedResponse || !parsedResponse['response']) {
            console.log('something wrong. maybe service key')
            return null;
        }
        const { header, body } = parsedResponse['response'];
        const { resultCode, resultMsg } = header;
        if (resultCode !== '00') {
            console.log(resultMsg);
            return null;
        }
        const { dataType, items } = body;
        console.log(body)
        console.log(dataType);
        console.log(items);
    }

    async getUltraSrtNcst(lat: number, lng: number, datetime?, numOfRows = 100, pageNo = 1) {
        let baseDatetime: moment.Moment = null;
        if (!datetime) {
            baseDatetime = moment();
            if (baseDatetime.minutes() < 40) {
                baseDatetime.subtract(1, 'hour')
            }
            console.log(baseDatetime.format())
        } else {
            baseDatetime = moment(datetime);
        }
        const { nx, ny } = this.latLngToGrid(lat, lng)

        const params = {
            serviceKey: this.serviceKey,
            pageNo: pageNo,
            numOfRows: numOfRows,
            dataType: 'JSON',
            base_date: baseDatetime.format('YYYYMMDD'),
            base_time: baseDatetime.format('HHmm'),
            nx: nx,
            ny: ny,
        }
        const qs = querystring.stringify(params);

        const url = `${VillageForecast.baseURL}/getUltraSrtFcst?${qs}`;
        console.log(url)

        const rawResponse = await fs.readFileSync(path.join(__dirname, '../examples/success01.json'));
        const parsedResponse = JSON.parse(rawResponse.toString());
        if (!parsedResponse || !parsedResponse['response']) {
            console.log('something wrong. maybe service key')
            return null;
        }
        const { header, body } = parsedResponse['response'];
        const { resultCode, resultMsg } = header;
        if (resultCode !== '00') {
            console.log(resultMsg);
            return null;
        }
        const { dataType, items } = body;
        console.log(dataType);
        console.log(items);
        // const 

        // TODO axios 
        // if contains SERVICE_KEY_IS_NOT_REGISTERED_ERROR check

    }

    // LCC DFS 좌표변환 ( 위경도->좌표(grid) )
    latLngToGrid(lat: number, lng: number): WeatherGrid {
        const { PI, tan, log, cos, pow, floor, sin, sqrt, atan, abs, atan2 } = Math
        const DEGRAD = Math.PI / 180.0;
        const RADDEG = 180.0 / Math.PI;

        const re = VillageForecast.RE / VillageForecast.GRID;
        const slat1 = VillageForecast.SLAT1 * DEGRAD;
        const slat2 = VillageForecast.SLAT2 * DEGRAD;
        const olon = VillageForecast.OLON * DEGRAD;
        const olat = VillageForecast.OLAT * DEGRAD;

        const rs: WeatherGrid = {
            nx: null,
            ny: null
        };
        let theta;
        let ra;

        let sn = tan(PI * 0.25 + slat2 * 0.5) / tan(PI * 0.25 + slat1 * 0.5);
        sn = log(cos(slat1) / cos(slat2)) / log(sn);
        let sf = tan(PI * 0.25 + slat1 * 0.5);
        sf = pow(sf, sn) * cos(slat1) / sn;
        let ro = tan(PI * 0.25 + olat * 0.5);
        ro = re * sf / pow(ro, sn);

        ra = tan(PI * 0.25 + (lat) * DEGRAD * 0.5);
        ra = re * sf / pow(ra, sn);
        theta = lng * DEGRAD - olon;
        if (theta > PI) theta -= 2.0 * PI;
        if (theta < -PI) theta += 2.0 * PI;
        theta *= sn;
        rs.nx = floor(ra * sin(theta) + VillageForecast.XO + 0.5);
        rs.ny = floor(ro - ra * cos(theta) + VillageForecast.YO + 0.5);
        console.log(rs)
        return rs;
    }

    // LCC DFS 좌표변환 ( 좌표(grid)->위경도 )
    gridToLatLng(nx: number, ny: number): Location {
        const { PI, tan, log, cos, pow, floor, sin, sqrt, atan, abs, atan2 } = Math
        const DEGRAD = PI / 180.0;
        const RADDEG = 180.0 / PI;

        const re = VillageForecast.RE / VillageForecast.GRID;
        const slat1 = VillageForecast.SLAT1 * DEGRAD;
        const slat2 = VillageForecast.SLAT2 * DEGRAD;
        const olon = VillageForecast.OLON * DEGRAD;
        const olat = VillageForecast.OLAT * DEGRAD;

        const rs: Location = {
            lat: null,
            lng: null
        };
        let theta;
        let ra;

        let sn = tan(PI * 0.25 + slat2 * 0.5) / tan(PI * 0.25 + slat1 * 0.5);
        sn = log(cos(slat1) / cos(slat2)) / log(sn);
        let sf = tan(PI * 0.25 + slat1 * 0.5);
        sf = pow(sf, sn) * cos(slat1) / sn;
        let ro = tan(PI * 0.25 + olat * 0.5);
        ro = re * sf / pow(ro, sn);

        var xn = nx - VillageForecast.XO;
        var yn = ro - ny + VillageForecast.YO;
        ra = sqrt(xn * xn + yn * yn);
        if (sn < 0.0) -ra;
        var alat = pow((re * sf / ra), (1.0 / sn));
        alat = 2.0 * atan(alat) - PI * 0.5;

        if (abs(xn) <= 0.0) {
            theta = 0.0;
        }
        else {
            if (abs(yn) <= 0.0) {
                theta = PI * 0.5;
                if (xn < 0.0) -theta;
            }
            else
                theta = atan2(xn, yn);
        }
        var alon = theta / sn + olon;
        rs.lat = alat * RADDEG;
        rs.lng = alon * RADDEG;
        console.log(rs)
        return rs;
    }

}

export interface Location {
    lat: number;
    lng: number;
}

export interface WeatherGrid {
    nx: number;
    ny: number;
}



