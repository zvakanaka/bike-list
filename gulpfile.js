var gulp = require('gulp'),
    babel = require('gulp-babel'),
    browserSync = require('browser-sync'),
    cleanCSS = require('gulp-clean-css'),
    del = require('del'),
    env = require('node-env-file'),
    fs = require('fs'),
    imagemin = require('gulp-imagemin'),
    jshint = require('gulp-jshint'),
    nodemon = require('gulp-nodemon'),
    pump = require('pump'),
    runSequence = require('run-sequence'),
    screenshot = require('url-to-screenshot'),
    stylus = require('gulp-stylus'),
    uglify = require('gulp-uglify');

env(__dirname+'/.env');
var PORTNO = process.env.PORT || 5000;
var SCREENSHOT_FILE = process.env.SCREENSHOT_FILE || '/screenshot/screenshot.jpg';
var BROWSER_SYNC_RELOAD_DELAY = 500;

gulp.task('default', function() {
  console.log('In Default');
  runSequence(
    'clean',
   ['copy-vendors', 'copy-configs', 'img', 'js', 'lint', 'css', 'transpile'],
   'browser-sync',
   'watch-it');
});

gulp.task('watch-it', function() {
  gulp.watch("views/**/*.ejs").on('change', browserSync.reload);
  gulp.watch('assets/js/**/*.js', ['js', browserSync.reload]);
  gulp.watch('assets/styles/**/*.styl', ['css']);
  gulp.watch('app.es6', ['transpile']);
});

gulp.task('browser-sync', ['nodemon'], function() {
  // for more browser-sync config options: http://www.browsersync.io/docs/options/
  browserSync({
    proxy: 'http://localhost:' + PORTNO,
    browser: 'google-chrome'
  });
});

gulp.task('bs-reload', function() {
  browserSync.reload();
});

gulp.task('nodemon', function(cb) {
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

gulp.task('js', function(cb) {
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

gulp.task('lint', function() {
  console.log('In lint');

  gulp.src('./**/*.js')
    .pipe(jshint());
});

// babelize es6 in assets
gulp.task('transpile', function() {
  return gulp.src('assets/js/**/*.es6')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('dist/js'));
});

// call via 'gulp screenshot'. App must be running
gulp.task('screenshot', function() {
  screenshot('http://localhost:' + PORTNO)
  .width(900)
  .height(600)
  .clip()
  .format('jpg')
  .capture(function(err, img) {
    if (err) throw err;
    fs.writeFileSync(__dirname + SCREENSHOT_FILE, img);
    console.log('open ' + SCREENSHOT_FILE);
  });
});
