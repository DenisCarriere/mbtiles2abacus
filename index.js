const fs = require('fs')
const d3 = require('d3-queue')
const path = require('path')
const mkdirp = require('mkdirp')
const MBTiles = require('mbtiles-offline')
const write = require('write-json-file')
const {tileToQuadkey} = require('global-mercator')
const {EventEmitter} = require('events')

/**
 * MBTiles to Abacus
 *
 * @param {string} mbtiles filepath
 * @param {string} [output] filepath
 * @param {*} [options] options
 * @param {number} [options.interval=64] Update time interval in milliseconds
 * @returns {EventEmitter}
 */
function mbtiles2abacus (mbtiles, output, options = {}) {
  if (!fs.existsSync(mbtiles)) throw new Error('<mbtiles> does not exist')

  if (!output) {
    const {dir, name} = path.parse(mbtiles)
    output = path.join(dir, name)
  }

  const db = new MBTiles(mbtiles)
  const ee = new EventEmitter()
  const interval = options.interval || 64
  let current = 0
  let errors = 0
  let total = 0
  let timer

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
      const [west, south, east, north] = metadata.bounds
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
