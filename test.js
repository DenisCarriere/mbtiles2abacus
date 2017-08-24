const fs = require('fs')
const path = require('path')
const test = require('tape')
const mbtiles2abacus = require('./')

test('mbtiles2abacus', t => {
  const mbtiles = path.join(__dirname, 'test', 'in', 'world_zoom_0-2.mbtiles')
  const output = path.join(__dirname, 'test', 'out', 'world_zoom_0-2.abacus')
  const ee = mbtiles2abacus(mbtiles, output)
  ee.on('start', status => {
    t.assert(status, 'start')
  })
  ee.on('end', status => {
    const metadata = JSON.parse(fs.readFileSync(path.join(output + '.json')))
    t.false(fs.existsSync(path.join(output, '.png')), 'empty png does not exist')
    t.equal(fs.readFileSync(path.join(output, '0.png')).byteLength, 48143, 'QuadTree 0')
    t.equal(fs.readFileSync(path.join(output, '2.png')).byteLength, 42128, 'QuadTree 2')
  })
  t.end()
})
