export interface IApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  collumns: any;
  result: T;
  errorCode: number;
}
