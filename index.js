const fs = require('fs')
const d3 = require('d3-queue')
const path = require('path')
const mkdirp = require('mkdirp')
const MBTiles = require('mbtiles-offline')
const write = require('write-json-file')
const tileToQuadkey = require('global-mercator').tileToQuadkey
const EventEmitter = require('events').EventEmitter

/**
 * MBTiles to Abacus
 *
 * @param {string} mbtiles filepath
 * @param {string} [output] filepath
 * @param {*} [options] options
 * @param {number} [options.interval=64] Update time interval in milliseconds
 * @returns {EventEmitter}
 */
function mbtiles2abacus (mbtiles, output, options) {
  options = options || {}
  if (!fs.existsSync(mbtiles)) throw new Error('<mbtiles> does not exist')

  if (!output) {
    const parse = path.parse(mbtiles)
    const dir = parse.dir
    const name = parse.name
    output = path.join(dir, name)
  }

  const db = new MBTiles(mbtiles, 'tms')
  const ee = new EventEmitter()
  const interval = options.interval || 64
  var current = 0
  var errors = 0
  var total = 0
  var timer

  function prestart () {
    const q = d3.queue(1)
    q.defer(callback => db.validate().then(() => callback(null)))
    q.defer(callback => db.count().then(count => {
      // Calculate total tiles in MBTiles
      total = count
      callback(null)
    }))
    q.awaitAll(() => {
      // Create Folder if not exists
      if (!fs.existsSync(output)) mkdirp.sync(output)
      start()
    })
  }

  function start () {
    ee.emit('start', {current, errors, total})

    // Start Update counter
    timer = setInterval(update, interval)

    // Update GeoPackage Metadata
    db.metadata().then(metadata => {
      // Save Metadata
      const west = metadata.bounds[0]
      const south = metadata.bounds[1]
      const east = metadata.bounds[2]
      const north = metadata.bounds[3]

      write.sync(output + '.json', {
        name: metadata.name,
        description: metadata.description,
        west,
        south,
        east,
        north,
        minzoom: metadata.minzoom,
        maxzoom: metadata.maxzoom
      })

      // Get All Tiles
      db.findAll().then(tiles => {
        const q = d3.queue(1)
        for (const tile of tiles) {
          const zoom = tile[2]
          if (zoom === 0) continue
          const quadkey = tileToQuadkey(tile)
          // Save Single tile
          q.defer(callback => {
            db.findOne(tile).then(image => {
              fs.writeFileSync(path.join(output, `${quadkey}.png`), image)
              current++
              callback(null)
            })
          })
        }
        q.awaitAll(errors => {
          if (errors) throw new Error(errors)
          shutdown()
        })
      })
    })
  }

  function update () {
    ee.emit('update', {current, errors, total})
  }

  function shutdown () {
    clearTimeout(timer)
    ee.emit('end', {current, errors, total})
  }

  setTimeout(() => prestart())
  return ee
}

module.exports = mbtiles2abacus
