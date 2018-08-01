path = require 'path'

exports.config =
  conventions:
    assets: /app\/assets\//

  paths:
    public: 'public'
    watched: ['app']

  npm:
    enabled: true

  files:
    javascripts:
      joinTo:
        # libraries
        #'js/vendor.js': 'vendor/*.js'
        # dsq
        'dist/dsq.js': 'app/dsq/dsq.js'
        # tests
        'tests/js/test.js': 'app/initialize.js'
        # pages
        #'tests/page.js': 'app/tests/page.js'

    stylesheets: 
      joinTo: 
      	'tests/css/style.css': /^(app\/stylesheets\/tests)/
      	'dist/dsq.css': /^(app\/stylesheets\/dsq)/

  modules:
    autoRequire:
      'dist/dsq.js': ['dsq/dsq']

  plugins:

    sass:
      mode: 'native'
      options:
        includePaths: [
        #  'node_modules/bourbon/core'
        #, 'node_modules/bourbon-neat/core'
        #, 'node_modules/normalize.css'
        #, 'node_modules/font-awesome/scss'
        ]
      # Set the precision for arithmetic operations.
      precision: 8
      # To enable embedded source maps, pass the option `sourceMapEmbed`. This is only supported in _native_ mode; Ruby Sass isn't supported.
      sourceMapEmbed: true

    postcss:
      processors:
        require('autoprefixer')(['defaults', '> 3%'])

    static:
      pathTransform: (f) -> path.relative 'pages', f
      processors: [
        require('html-brunch-static') {
          partials: /partials?/,
          layouts: /layouts?/,
          handlebars:
            enableProcessor: true,
            helpers: {
              ifEq: (a,b,opts) -> if a is b then opts.fn(this) else opts.inverse(this),
              ifEqDebug: (a,b,opts) -> console.log "a: '" + a + "'"; console.log "b: '" + b + "'"; if a is b then opts.fn(this) else opts.inverse(this),
              log: (msg...) -> console.log msg,
              #or: (opts) -> for i in (arguments.length - 1) console.log arguments[i]
              #if arguments[i] then opts.fn(true); break else opts.fn(false) 
          	}
        }
      ]

    babel:
      presets: [
      	['env', {
          targets: {
            browsers: ['last 2 versions', 'not dead', '>1%']
          }
        }]
      ]
