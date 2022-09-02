import expect from 'expect'

type User = {
  name: string
  age: number
}

const user: User = {
  name: 'Jhon Doe',
  age: 40,
}

describe('Hello world', () => {
  it('should have the right age', () => {
    expect(user.age).toBe(40)
  })
})
