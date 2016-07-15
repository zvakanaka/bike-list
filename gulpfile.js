var gulp = require('gulp'),
    nodemon = require('gulp-nodemon'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    cleanCSS = require('gulp-clean-css'),
    pump = require('pump'),
    del = require('del'),
    runSequence = require('run-sequence'),
    imagemin = require('gulp-imagemin');

gulp.task('default', function() {
  console.log('In Default');
  runSequence('clean', ['img', 'uglify', 'lint', 'minify-css', 'start']);
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



gulp.task('start', function () {
  nodemon({
    script: 'app.js',
    tasks: ['uglify', 'minify-css'],
    ext: 'js css',
    env: { 'NODE_ENV': 'dev' }
  })
  .on('restart', function () {
    console.log('Restarted')
  });
});
