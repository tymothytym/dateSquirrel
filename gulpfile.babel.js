'use strict';

import plugins from 'gulp-load-plugins';
import yargs from 'yargs';
import browser from 'browser-sync';
import gulp from 'gulp';
import panini from 'panini';
import rimraf from 'rimraf';
import yaml from 'js-yaml';
import fs from 'fs';
import webpackStream from 'webpack-stream';
import webpack2 from 'webpack';
import named from 'vinyl-named';
import uncss from 'postcss-uncss';
import cleancss from 'postcss-clean';
//import rename from 'gulp-rename';
//import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';

// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);
// Tell Webpack
const STATE = !!(yargs.argv.production) ? 'production' : 'development';

// Load settings from settings.yml
const { COMPATIBILITY, PORT, UNCSS_OPTIONS, CLEAN_OPTIONS, PATHS } = loadConfig();


function loadConfig() {
    let ymlFile = fs.readFileSync('config.yml', 'utf8');
    return yaml.load(ymlFile);
}

// Build the "dist" folder by running all of the below tasks
gulp.task('build',
    gulp.series(clean, gulp.parallel(pages, sass, javascript, images, copy, vendor, dsqScss)));

// Build the site, run the server, and watch for file changes
gulp.task('default',
    gulp.series('build', server, watch));

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
    rimraf(PATHS.dist, done);
}

// Copy vendor & other files out of the assets folder
function vendor() {
    return gulp.src(PATHS.vendor)
        .pipe(gulp.dest(PATHS.dist + '/test/vendor'));
}
function copy() {
    return gulp.src(PATHS.assets)
        .pipe(gulp.dest(PATHS.dist));
}

// Copy page templates into finished HTML files
function pages() {
    return gulp.src('src/pages/**/*.{html,hbs,handlebars}')
        .pipe(panini({
            root: 'src/pages/',
            layouts: 'src/layouts/',
            partials: 'src/partials/',
            data: 'src/data/',
            helpers: 'src/helpers/'
        }))
        .pipe(gulp.dest(PATHS.dist));
}

// Load updated HTML templates and partials into Panini
function resetPages(done) {
    panini.refresh();
    done();
}

// Compile demo / test Sass into CSS
// In production, the CSS is compressed
function sass() {
    return gulp.src('src/assets/scss/test.scss')
        .pipe($.wait(500))
        .pipe($.sourcemaps.init())
        .pipe($.sass({
                includePaths: PATHS.sass
            })
            .on('error', $.sass.logError))
        .pipe($.autoprefixer({
            browsers: COMPATIBILITY
        }))
        //.pipe(!PRODUCTION,gulp.dest(PATHS.dist + '/test'))
        .pipe($.if(PRODUCTION, $.postcss([
            cleancss(CLEAN_OPTIONS)
        ])))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        .pipe($.if(PRODUCTION, $.rename({ suffix: '.min' })))
        .pipe(gulp.dest(PATHS.dist + '/test'))
        .pipe(browser.reload({ stream: true }));
}

function dsqScss() {
    return gulp.src('src/plugin/dsq.scss')
        .pipe($.wait(500))
        .pipe($.sourcemaps.init())
        .pipe($.sass({
                includePaths: PATHS.sass
            })
            .on('error', $.sass.logError))
        .pipe($.autoprefixer({
            browsers: COMPATIBILITY
        }))
        //.pipe(gulp.dest(PATHS.dist + '/dateSquirrel'))
        .pipe($.if(PRODUCTION, $.postcss([
            cleancss(CLEAN_OPTIONS)
        ])))
        .pipe($.if(PRODUCTION, $.rename({ suffix: '.min' })))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        .pipe(gulp.dest(PATHS.dist + '/dateSquirrel'))
        .pipe(browser.reload({ stream: true }));
}
/*let webpackConfig = {
  module: {
    rules: [
      {
        test: /.js$/,
        use: [
          {
            loader: 'babel-loader'
          }
        ]
      }
    ]
  },
  plugins: [
      new BundleAnalyzerPlugin()
  ]
};
let webpackConfigPlugin = {
  output: {
    library: 'dsq',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /.js$/,
        use: [
          {
            loader: 'babel-loader'
          }
        ]
      }
    ]
  }
};*/
let webpackConfig = {
    entry: {
        'dateSquirrel/dsq': './src/plugin/dsq.js',
        'test/test': './src/assets/js/app.js'
    },
    output: {
        path: '/',
        filename: '[name].js',
        library: 'dsq',
        libraryTarget: 'umd'
    },
    module: {
        rules: [{
            test: /.js$/,
            use: [{
                loader: 'babel-loader'
            }]
        }]
    },
    mode: STATE
};
// Bundle demo JavaScript into one file
// In production, the file is minified
function javascript() {
    return gulp.src(PATHS.entries)
        .pipe(named())
        .pipe($.sourcemaps.init())
        .pipe(webpackStream(webpackConfig, webpack2))
    	//.pipe(gulp.dest(PATHS.dist))
        .pipe($.if(PRODUCTION, $.uglify()
            .on('error', e => { console.log(e); })
        ))
    	.pipe($.if(PRODUCTION, $.rename({suffix: '.min' })))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    	.pipe(gulp.dest(PATHS.dist));
}

// Bundle plugin scripts into one file
// In production, the file is minified
/*function dsqJs() {
  return gulp.src(PATHS.plugin)
    .pipe(named())
    .pipe($.sourcemaps.init())
    .pipe(webpackStream(webpackConfigPlugin, webpack2))
    .pipe(gulp.dest(PATHS.dist))
    .pipe($.if(PRODUCTION, $.uglify()
      .on('error', e => { console.log(e); })
    ))
    .pipe($.if(PRODUCTION, $.rename({suffix: '.min' })))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe($.if(PRODUCTION, gulp.dest(PATHS.dist)));
} */

// Compile plugin Sass into CSS
// In production, the CSS is compressed
/*function dsqScss() {
  return gulp.src('src/plugin/dsq.scss')
    .pipe($.wait(500))
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: PATHS.sass
    })
    .on('error', $.sass.logError))
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    .pipe(gulp.dest(PATHS.dist + '/dateSquirrel'))
    .pipe($.if(PRODUCTION, $.postcss([
        cleancss(CLEAN_OPTIONS)
      ])))
    .pipe($.if(PRODUCTION, $.rename({ suffix: '.min' })))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/dateSquirrel'))
    .pipe(browser.reload({ stream: true }));
}*/

// Copy images to the "dist" folder
// In production, the images are compressed
function images() {
    return gulp.src(PATHS.assets + '/img/**/*')
        //.pipe($.if(PRODUCTION, $.imagemin({
        //  progressive: true
        //})))
        .pipe(gulp.dest(PATHS.dist + '/test/img'));
}

// Start a server with BrowserSync to preview the site in
function server(done) {
    browser.init({
        server: PATHS.dist,
        port: PORT
    });
    done();
}

// Reload the browser with BrowserSync
function reload(done) {
    browser.reload();
    done();
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
    gulp.watch('src/assets/vendor', vendor);
    gulp.watch('src/assets/raw', copy);
    gulp.watch('src/pages/**/*.html').on('all', gulp.series(pages, browser.reload));
    gulp.watch('src/{layouts,partials}/**/*.html').on('all', gulp.series(resetPages, pages, browser.reload));
    gulp.watch('src/assets/scss/**/*.scss').on('all', sass);
    gulp.watch('src/plugin/**/{*.js,*.scss}').on('all', gulp.series(javascript, dsqScss, browser.reload));
    gulp.watch('src/assets/js/**/*.js').on('all', gulp.series(javascript, browser.reload));
    gulp.watch('src/assets/img/**/*').on('all', gulp.series(images, browser.reload));
    //gulp.watch(PATHS.assets + '/fonts/**/*').on('all', gulp.series(fonts, browser.reload));
}