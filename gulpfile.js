var gulp = require('gulp'),
    babel = require('gulp-babel'),
    cleanCSS = require('gulp-clean-css'),
    del = require('del'),
    env = require('node-env-file'),
    fs = require('fs'),
    imagemin = require('gulp-imagemin'),
    jshint = require('gulp-jshint'),
    pump = require('pump'),
    runSequence = require('run-sequence'),
    stylus = require('gulp-stylus'),
    uglify = require('gulp-uglify');

env(__dirname+'/.env');
var PORTNO = process.env.PORT || 5000;
var SCREENSHOT_FILE = process.env.SCREENSHOT_FILE || '/screenshot/screenshot.jpg';
var BROWSER_SYNC_RELOAD_DELAY = 500;

//Only devs should need these
var screenshot, browserSync, nodemon;
if (process.env.NODE_ENV == 'dev') {
  screenshot = require('url-to-screenshot');
  browserSync = require('browser-sync');
  nodemon = require('gulp-nodemon');
}

gulp.task('default', function() {
  console.log('In Default');
  runSequence(
    'clean',
   ['copy-configs', 'img', 'js', 'css', 'transpile', 'lint'],
   'browser-sync',
   'watch-it');
});

gulp.task('build', function() {
  runSequence('clean', ['copy-configs', 'img', 'js', 'lint', 'css', 'transpile'], 'exit');
});

gulp.task('exit', function() {
  process.exit();
});

gulp.task('watch-it', function() {
  gulp.watch("views/**/*.ejs").on('change', browserSync.reload);
  gulp.watch('assets/js/**/*.js', ['js', browserSync.reload]);
  gulp.watch('assets/styles/**/*.styl', ['css']);
  gulp.watch('lib/**/*.es6', ['transpile']);
});

gulp.task('browser-sync', ['nodemon'], function() {
  if (process.env.NODE_ENV != 'dev') {
    // for more browser-sync config options: http://www.browsersync.io/docs/options/
    browserSync({
      proxy: 'http://localhost:' + PORTNO,
      browser: 'google-chrome'
    });
  } else {
    console.log('ERROR: Must set NODE_ENV=dev in .env for browserSync');
  }
});

gulp.task('bs-reload', function() {
  if (process.env.NODE_ENV != 'dev') {
    browserSync.reload();
  } else {
    console.log('ERROR: Must set NODE_ENV=dev in .env for browserSync');
  }

});

gulp.task('nodemon', function(cb) {
  if (process.env.NODE_ENV != 'dev') {
    var called = false;
    return nodemon({
      script: 'app.js',
      // watch core server file(s) that require server restart on change
      watch: ['app.js', 'lib/**/*.js']
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
  } else {
    console.log('ERROR: Must set NODE_ENV=dev in .env for nodemon');
  }
});

// Include css
// Stylus has an awkward and perplexing 'include css' option
gulp.task('css', function() {
  return gulp.src('assets/styles/*.{styl, css}')
    .pipe(stylus({
      'include css': true
    }))
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('clean', function() {
  return del(['dist']);
});

gulp.task('img', function () {
    return gulp.src('assets/images/*')
        .pipe(imagemin({
            progressive: true
        }))
        .pipe(gulp.dest('dist/images'));
});

gulp.task('js', function(cb) {
  //uglify and copy
  pump([
      gulp.src('assets/js/**/*.js'),
      uglify(),
      gulp.dest('dist/js/')
    ],
    cb
  );
});

gulp.task('copy-configs', function() {
   gulp.src('./assets/manifest.json')
   .pipe(gulp.dest('./dist/vendors/manifest.json'));
});

gulp.task('lint', function() {
  gulp.src('./**/*.js')
    .pipe(jshint());
});

// babelize es6 in assets
gulp.task('transpile', function() {
  return gulp.src('lib/**/*.es6')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('lib/js/'));
});

// call via 'gulp screenshot'. App must be running
gulp.task('screenshot', function() {
  if (process.env.NODE_ENV != 'dev') {
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
  } else {
    console.log('ERROR: Must set NODE_ENV=dev in .env for screenshot');
  }
});
