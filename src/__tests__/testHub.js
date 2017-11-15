import {assert} from 'chai'

describe('createSlicer', () => {
  it('stores data for valid origin', () => {
      const mySlicer = createSlicer()
      const newState = mySlicer(state)
      assert.deepEqual(newState, state)
    })
})
