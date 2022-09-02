export const addDecimalsNumber = (number: number) => {
  const nf = new Intl.NumberFormat('es-ES')
  return nf.format(number)
}
