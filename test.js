const fs = require('fs')
const path = require('path')
const test = require('tape')
const mbtiles2abacus = require('./')

test('mbtiles2abacus', t => {
  const mbtiles = path.join(__dirname, 'test', 'in', 'world_zoom_0-2.mbtiles')
  const output = path.join(__dirname, 'test', 'out', 'world_zoom_0-2')
  const ee = mbtiles2abacus(mbtiles, output)
  ee.on('start', status => {
    t.assert(status)
  })
  ee.on('end', status => {
    t.false(fs.existsSync(path.join(output, '.png')))
  })
  t.end()
})
