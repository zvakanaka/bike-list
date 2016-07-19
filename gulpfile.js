var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    cleanCSS = require('gulp-clean-css'),
    pump = require('pump'),
    del = require('del'),
    runSequence = require('run-sequence'),
    env = require('node-env-file'),
    screenshot = require('url-to-screenshot'),
    fs = require('fs'),
    browserSync = require('browser-sync'),
    stylus = require('gulp-stylus'),
    imagemin = require('gulp-imagemin');

env(__dirname+'/.env');
var PORTNO = process.env.PORT || 5000;

var BROWSER_SYNC_RELOAD_DELAY = 500;

gulp.task('default', ['browser-sync'], function () {
  gulp.watch("views/**/*.ejs").on('change', browserSync.reload);
  gulp.watch('assets/js/**/*.js',   ['js', browserSync.reload]);
  gulp.watch('assets/styles/**/*.styl',  ['css']);
  //gulp.watch('views/**/*.ejs', ['bs-reload']);
});

gulp.task('browser-sync', ['nodemon'], function () {
  // for more browser-sync config options: http://www.browsersync.io/docs/options/
  browserSync({
    // informs browser-sync to proxy our expressjs app which would run at the following location
    proxy: 'http://localhost:4000',
    // informs browser-sync to use the following port for the proxied app
    // notice that the default port is 3000, which would clash with our expressjs
    // files: ["views/**/*.*"],
    // open the proxied app in chrome
    browser: 'google-chrome'
  });
});

gulp.task('bs-reload', function () {
  browserSync.reload();
});

gulp.task('nodemon', function (cb) {
  var called = false;
  return nodemon({
    script: 'app.js',
    // watch core server file(s) that require server restart on change
    watch: ['app.js']
  })
    .on('start', function onStart() {
      // ensure start only got called once
      if (!called) { cb(); }
      called = true;
    })
    .on('restart', function onRestart() {
      // reload connected browsers after a slight delay
      setTimeout(function reload() {
        browserSync.reload({
          stream: false
        });
      }, BROWSER_SYNC_RELOAD_DELAY);
    });
});

// Include css
// Stylus has an awkward and perplexing 'include css' option
gulp.task('css', function() {
  console.log('In css');

  return gulp.src('assets/styles/*.{styl, css}')
    .pipe(stylus({
      'include css': true
    }))
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('dist/styles'));
});

// gulp.task('default', function() {
//   console.log('In Default');
//   runSequence('clean', ['copy-vendors', 'copy-configs', 'img', 'uglify', 'lint', 'minify-css', 'start']);
// });

gulp.task('clean', function() {
  console.log('In Clean');
  return del(['dist']);
});

gulp.task('img', function() {
  console.log('In img');
  gulp.src('assets/images/*')
    .pipe(imagemin())
    .pipe(gulp.dest('dist/images'));
});

gulp.task('js', function (cb) {
  console.log('In js');
  //uglify and copy
  pump([
      gulp.src('assets/js/**/*.js'),
      uglify(),
      gulp.dest('dist/js/')
    ],
    cb
  );
});

gulp.task('copy-vendors', function() {
   gulp.src('./assets/vendors/js/**/*.min.js')
   .pipe(gulp.dest('./dist/vendors/js'));

   gulp.src('./assets/vendors/css/**/*.min.css')
   .pipe(gulp.dest('./dist/vendors/css'));
});

gulp.task('copy-configs', function() {
   gulp.src('./assets/manifest.json')
   .pipe(gulp.dest('./dist/vendors/manifest.json'));
});

gulp.task('lint', function () {
  console.log('In lint');

  gulp.src('./**/*.js')
    .pipe(jshint());
});

gulp.task('screenshot', function () {
  screenshot('http://localhost:' + PORTNO)
  .width(900)
  .height(600)
  .clip()
  .format('jpg')
  .capture(function(err, img) {
    if (err) throw err;
    fs.writeFileSync(__dirname + '/screenshot/screenshot.jpg', img);
    console.log('open /screenshot/screenshot.jpg');
  });
});

gulp.task('start-no-watch', function () {
  var spawn = require('child_process').spawn;
  var startNode = spawn('node', ['app.js']);
});

gulp.task('start', function () {
  nodemon({
    script: 'app.js',
    tasks: ['uglify', 'minify-css'],
    ext: 'js css',
    ignore: [
      'dist/',
      'node_modules/',
      'bower_components/',
      '.git/',
      'screenshot/'
    ],
    env: { 'NODE_ENV': 'dev' }
  })
  .on('restart', function () {
    console.log('Restarted')
  });
});

// watch files for changes and reload
gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: ''
    }
  });

  gulp.watch(['views/**/*.ejs', 'dist/styles/**/*.css', 'dist/js/**/*.js'], {cwd: ''}, reload);
});
