module.exports = {
  apps : [{
    name   : "iot-backend",
    script : "./index.mjs",
    watch : true,
    ignore_watch: [
      "frontend.html"
    ]
  }]
}
