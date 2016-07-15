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
    imagemin = require('gulp-imagemin');

env(__dirname+'/.env');
var PORTNO = process.env.PORT || 5000;

gulp.task('default', function() {
  console.log('In Default');
  runSequence('clean', ['copy-vendors', 'copy-configs', 'img', 'uglify', 'lint', 'minify-css', 'start']);
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

gulp.task('uglify', function (cb) {
  console.log('In uglify');

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

gulp.task('minify-css', function() {
  console.log('In minify-css');
  return gulp.src('assets/styles/*.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('dist/styles'));
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
