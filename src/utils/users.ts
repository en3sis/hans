/**
 *
 * @param user or user id
 * @returns returns either the user id or the user id from a mention
 */
export const extractUser = (user: string) => {
  let _member: string

  if (/<@!?\d+>/g.test(user)) {
    _member = user.split(`<@!`)[1].replace('>', '')
  } else {
    _member = user
  }

  return _member
}
