'use strict'

// Foundation for Apps
//
// We use this Gulpfile to assemble the documentation, run unit tests,
// and deploy changes to the live documentation and CDN.
//
// The tasks are grouped into these categories:
//   1. Libraries
//   2. Variables
//   3. Cleaning files
//   4. Copying files
//   5. Stylesheets
//   6. JavaScript
//   7. Testing
//   8. Server
//   9. Deployment
//  10. Default tasks

// 1. LIBRARIES
// - - - - - - - - - - - - - - -

var gulp           = require('gulp'),
    rimraf         = require('rimraf'),
    runSequence    = require('run-sequence'),
    markdown       = require('gulp-markdown'),
    highlight      = require('gulp-highlight'),
    autoprefixer   = require('gulp-autoprefixer'),
    sass           = require('gulp-ruby-sass'),
    nodeSass       = require('gulp-sass'),
    uglify         = require('gulp-uglify'),
    minify         = require('gulp-minify-css'),
    concat         = require('gulp-concat'),
    connect        = require('gulp-connect'),
    modRewrite     = require('connect-modrewrite'),
    dynamicRouting = require('./bin/gulp-dynamic-routing'),
    karma          = require('gulp-karma'),
    rsync          = require('gulp-rsync'),
    merge          = require('merge-stream'),
    settingsParser = require('settings-parser');

var p = require('./package.json');

// 2. VARIABLES
// - - - - - - - - - - - - - - -

var foundationJS = [
  'bower_components/fastclick/lib/fastclick.js',
  'bower_components/viewport-units-buggyfill/viewport-units-buggyfill.js',
  'bower_components/tether/tether.js',
  'bower_components/angular/angular.js',
  'bower_components/angular-animate/angular-animate.js',
  'bower_components/angular-ui-router/release/angular-ui-router.js',
  'bower_components/hammerjs/hammer.js',
  'js/vendor/**/*.js',
  'js/angular/**/*.js',
  '!js/angular/app.js'
];
var docsJS = [
  'bower_components/marked/lib/marked.js',
  'bower_components/angular-highlightjs/angular-highlightjs.js',
  'bower_components/highlightjs/highlight.pack.js',
  'bower_components/allmighty-autocomplete/script/autocomplete.js',
  'docs/assets/js/app.js'
];

// 3. CLEANIN' FILES
// - - - - - - - - - - - - - - -

// Clean build directory
gulp.task('clean', function(cb) {
  rimraf('./build', cb);
});

// Clean the partials directory
gulp.task('clean:partials', function(cb) {
  rimraf('./build/partials', cb);
});

// 4. COPYING FILES
// - - - - - - - - - - - - - - -

// Copy static files (but not the Angular templates, Sass, or JS)
gulp.task('copy', function() {
  var dirs = [
    './docs/**/*.*',
    '!./docs/templates/**/*.*',
    '!./docs/assets/{scss,js}/**/*.*'
  ];
  gulp.src(dirs, {
    base: './docs/'
  })
    .pipe(gulp.dest('build'));

  return gulp.src('./iconic/**/*')
    .pipe(gulp.dest('build/assets/img/iconic/'));
});

// Copy page templates and generate routes
gulp.task('copy:templates', ['copy'], function() {
  var config = [];

  return gulp.src('./docs/templates/**/*.html')
    .pipe(dynamicRouting({
      path: 'build/assets/js/routes.js',
      root: 'docs'
    }))
    .pipe(gulp.dest('./build/templates'))
  ;
});

// Copy Foundation directive partials
gulp.task('copy:partials', ['clean:partials'], function() {
  return gulp.src(['js/angular/components/**/*.html'])
    .pipe(gulp.dest('./build/components/'));
});

// 5. STYLESHEETS
// - - - - - - - - - - - - - - -

// Inject styles for docs-specific libraries
gulp.task('css', ['sass'], function() {
  var dirs = [
    'bower_components/allmighty-autocomplete/style/autocomplete.css',
    'build/assets/css/app.css'
  ];
  return gulp.src(dirs)
    .pipe(concat('app.css'))
    .pipe(gulp.dest('build/assets/css'))
  ;
});

// Compile stylesheets with Ruby Sass
gulp.task('sass', function() {
  return sass('docs/assets/scss/', {
      loadPath: ['scss'],
      style: 'nested',
      bundleExec: true
    })
    .on('error', function(err) {
      console.log(err.message);
    })
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'ie 10']
    }))
    .pipe(gulp.dest('./build/assets/css/'));
});

// Compile stylesheets with node-sass
gulp.task('node-sass', function() {
  return gulp.src('docs/assets/scss/app.scss')
    .pipe(nodeSass({
      includePaths: ['scss'],
      outputStyle: 'nested',
      errLogToConsole: true
    }))
    .pipe(autoprefixer({
      browsers: ['last 2 versions', 'ie 10']
    }))
    .pipe(concat('app_node.css'))
    .pipe(gulp.dest('./build/assets/css/'));
});

// Generate Sass settings file
gulp.task('settings', function() {
  return settingsParser([
    'scss/_includes.scss',
    'scss/_global.scss',
    'scss/helpers/_breakpoints.scss',
    'scss/components/_typography.scss',
    'scss/components/_grid.scss',
    'scss/components/*.scss'
  ], {
    title: 'Foundation for Apps Settings'.toUpperCase(),
    partialsPath: 'build/partials/scss',
    settingsPath: 'scss'
  });
});

// 6. JAVASCRIPT
// - - - - - - - - - - - - - - -

// Compile Foundation JavaScript
gulp.task('javascript', function() {
  return gulp.src(foundationJS)
    .pipe(uglify({
      beautify: true,
      mangle: false
    }).on('error', function(e) {
      console.log(e);
    }))
    .pipe(concat('foundation.js'))
    .pipe(gulp.dest('./build/assets/js/'))
  ;
});

// Compile documentation-specific JavaScript
gulp.task('javascript:docs', function() {
  return gulp.src(docsJS)
    .pipe(uglify({
      beautify: true,
      mangle: false
    }))
    .pipe(concat('app.js'))
    .pipe(gulp.dest('./build/assets/js/'))
  ;

});

// 7. SERVER
// - - - - - - - - - - - - - - -

gulp.task('server:start', function() {
  connect.server({
    root: './build',
    middleware: function() {
      return [
        modRewrite(['^[^\\.]*$ /index.html [L]'])
      ];
    },
  });
});


// gulp.task('minify-css', function() {
//   gulp.src('./build/assets/css/app.css')
//     .pipe(minify({keepBreaks:true}))
//     .pipe(concat('app.min.css'))
//     .pipe(gulp.dest('./build/assets/css/'))
// });

// 8. TESTING
// - - - - - - - - - - - - - - -

gulp.task('karma:test', ['build', 'node-sass'], function() {
  var testFiles = [
    'build/assets/js/foundation.js',
    'build/assets/js/app.js',
    'bower_components/angular-mocks/angular-mocks.js',
    'bower_components/jsdiff/diff.js',
    'build/assets/css/app.css',
    'build/assets/css/app_node.css',
    'tests/unit/common/*Spec.js'
  ];

  return gulp.src(testFiles)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'run'
    }))
    .on('error', function(err) {
      throw err;
    })
  ;

});

gulp.task('sass:test', function() {
  sass('./tests/unit/scss/tests.scss', {
    loadPath: ['scss', 'docs/assets/scss', 'bower_components/bootcamp/dist'],
    style: 'nested',
    bundleExec: true
  })
    .on('data', function(data) {
      console.log(data.contents.toString());
    });
});

gulp.task('test', ['karma:test', 'sass:test'], function() {
  console.log('Tests finished.');
});

// 9. DEPLOYMENT
// - - - - - - - - - - - - - - -

// Deploy documentation
gulp.task('deploy', ['build', 'settings'], function() {
  return gulp.src('build/**')
    .pipe(rsync({
      root: 'build',
      hostname: 'deployer@72.32.134.77',
      destination: '/home/deployer/sites/foundation-apps/current'
    }));
});

// Deploy to CDN
gulp.task('deploy:cdn', ['build'], function() {
  var js = gulp.src(foundationJS)
    .pipe(concat('foundation-apps-' + p.version +'.js'))
    .pipe(gulp.dest('./build/assets/js/'));
  var jsMin = gulp.src(['build/assets/js/**'])
    .pipe(uglify({
      beautify: true,
      mangle: false
    }))
    .pipe(concat('foundation-apps-' + p.version +'.min.js'))
    .pipe(gulp.dest('./build/assets/js/'));
  var css = gulp.src(['build/assets/css/**'])
    .pipe(concat('foundation-apps-' + p.version +'.css'))
    .pipe(gulp.dest('./build/assets/css/'));
  var cssMin = gulp.src('./build/assets/css/app.css')
    .pipe(minify())
    .pipe(concat('foundation-apps-' + p.version +'.min.css'))
    .pipe(gulp.dest('./build/assets/css/'));

  merge(js, jsMin, css, cssMin)
    .pipe(rsync({
      hostname: 'deployer@72.32.134.77',
      destination: '/home/deployer/sites/foundation-apps-cdn/current',
      relative: false
    }));
});

// 10. NOW BRING IT TOGETHER
// - - - - - - - - - - - - - - -

// Build the documentation once
gulp.task('build', function(cb) {
  runSequence('clean', ['copy', 'copy:partials', 'css', 'javascript', 'javascript:docs'], 'copy:templates', function() {
    console.log('Successfully built.');
    cb();
  });
});

// Build the documentation, start a test server, and re-compile when files change
gulp.task('default', ['build', 'server:start'], function() {

  // Watch static files
  gulp.watch(['./docs/**/*.*', '!./docs/templates/**/*.*', '!./docs/assets/{scss,js}/**/*.*'], ['copy']);

  // Watch Angular templates
  gulp.watch(['docs/templates/**/*.html'], ['copy:templates']);

  // Watch Angular partials
  gulp.watch(['js/angular/components/**/**.html'], ['copy:partials']);

  // Watch Sass
  gulp.watch(['./docs/assets/scss/**/*', './scss/**/*'], ['css']);

  // Watch JavaScript
  gulp.watch(['./docs/assets/js/**/*', './js/**/*'], ['javascript']);
});
