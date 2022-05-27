(function(angular) {
  'use strict';
  var module = angular.module('app', [
    'ngAnimate',
    'ngTouch'
  ]);

  module.directive('backgroundImagePreload', ['$imagePreload', function($imagePreload) {
    return {
      'restrict': 'A',
      'link': function(scope, element, attr) {
        if (!attr.backgroundImagePreload) return;
        $imagePreload(attr.backgroundImagePreload).then(function() {
          element.css({
            'background-image': 'url(' + attr.backgroundImagePreload + ')'
          });
        });
      }
    };
  }]);

  module.factory('$imagePreload', ['$q', function($q) {
    return function(url) {
      var deferred = $q.defer(),
        img = new Image();
      img.src = url;

      if (img.complete) {
        deferred.resolve();
      } else {
        img.addEventListener('load', function() {
          deferred.resolve();
        });

        img.addEventListener('error', function() {
          deferred.reject();
        });
      }

      return deferred.promise;
    };
  }]);

  module.directive('background', ['$http', '$log', '$interval', '$imagePreload', '$window', '$animate', '$timeout', '$compile', function($http, $log, $interval, $imagePreload, $window, $animate, $timeout, $compile) {
    return {
      'restrict': 'A',
      'scope': '=',
      'link': function(scope, element, attr) {
        scope.window = angular.element($window);
        scope.bgProcess = undefined;
        scope.assets = [];
        scope.auto = (attr.auto) ? true : false;
        scope.config = {
          method: 'GET',
          url: (attr.background) ? attr.background + '?limit=' + attr.requestLimit : 'https://www.reddit.com/r/earthporn/top.json?limit=50'
        };

        scope.getWindowDimensions = function() {
          return {
            'h': $window.innerHeight,
            'w': $window.innerWidth
          };
        };

        scope.$watch(scope.getWindowDimensions, function(n) {
          if (!n) {
            return;
          }

          scope.height = n.h;
          scope.width = n.w;

          // $log.debug('width X height:', scope.height, scope.width);
        }, true);

        scope.window.bind('resize', function() {
          scope.$apply();
        });

        scope.change = function() {
          if (scope.assets.length > 0) {
            scope.rand = Math.floor(Math.random() * (scope.assets.length - 1)) + 1;

            if (scope.assets[scope.rand]) {
              scope.loading = true;

              scope.oldBg = element.children(':first');
              
              scope.newBg = angular.element('<div/>').addClass('image').addClass('fade-out');


              $imagePreload(scope.assets[scope.rand].img).then(function() {
                scope.bg = {};

                scope.newBg.css({
                  'background-image': 'url(' + scope.assets[scope.rand].img + ')'
                });

                element.append(scope.newBg);
                $compile(scope.newBg)(scope);
                $animate.addClass(scope.oldBg, 'fade-out');
                
                $timeout(function() {
                  scope.bg.img = scope.assets[scope.rand].img;
                  scope.bg.title = scope.assets[scope.rand].title;
                  scope.bg.author = scope.assets[scope.rand].author;
                  scope.bg.authorLink = scope.assets[scope.rand].author; // 'https://www.reddit.com/u/'
                  scope.bg.link = scope.assets[scope.rand].link; // 'https://www.reddit.com'
                  scope.bg.subreddit = '/r/' + scope.assets[scope.rand].subreddit;
                  scope.bg.show = true;
                }, 1000);
                
                $animate.removeClass(scope.newBg, 'fade-out').then(function() {
                  $timeout(function() {
                    scope.oldBg.remove();
                  }, 5000);
                });
            
              });

              scope.loading = false;

            }
          } else {
            scope.stopChange();
          }
        };

        scope.startChange = function() {
          if (angular.isDefined(scope.bgProcess)) {
            return;
          }

          scope.bgProcess = $interval(function() {
            scope.change();
          }, 25000);
        };

        scope.stopChange = function() {
          if (angular.isDefined(scope.bgProcess)) {
            $interval.cancel(scope.bgProcess);
            scope.bgProcess = undefined;
          }
        };

        element.on('$destroy', function() {
          $interval.cancel(scope.bgProcess);
        });

        $http(scope.config)
          .success(function(response) {
            scope.data = response.data.children;

            angular.forEach(scope.data, function(value) {
              if ((value.data.preview) && (value.data.preview.images[0].source.url) && scope.height < value.data.preview.images[0].source.height && scope.width < value.data.preview.images[0].source.width) {
                // $log.debug('value.data', value.data);

                this.push({
                  author: value.data.author,
                  link: value.data.permalink,
                  title: value.data.title,
                  subreddit: value.data.subreddit,
                  img: value.data.preview.images[0].source.url.replace(/^http:\/\//i, 'https://')
                });
                
                if (element.children(':first') && !element.children(':first').css('background-image')) {
                  scope.change();
                }
              }
            }, scope.assets);

            if (scope.auto) {
              scope.startChange();
            }

          }, function(response) {
            // $log.error(response);
          });

      }
    };
  }]);

})(window.angular);