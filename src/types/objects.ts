export type GenericObjectT = {
  [key: string]: {
    [key: string]: string | boolean | number | [] | { [key: string]: string | boolean | number }
  }
}
