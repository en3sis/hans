export type GenericObjectT = {
  [key: string]: {
    [key: string]: string | boolean | [] | { [key: string]: string | boolean }
  }
}
