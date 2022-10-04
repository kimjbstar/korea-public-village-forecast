import { AxiosResponse } from "axios";

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
  origin: Object;
  error?: any;
}

export interface FCastResult {
  url: string;
  baseDate: string;
  forecasts: FCastResultDate[];
  origin: Object;
  error?: any;
}

export interface FCastResultDate {
  date: string;
  items: WeatherItem[];
}

export interface HTTPFetchResult {
  url: string;
  response: AxiosResponse;
}
