angular.module('foundation.notification', []);

angular.module('foundation.notification')
  .controller('FaNotificationController', ['$scope', 'FoundationApi', function FaTabsController($scope, foundationApi) {
    var controller = this;
    var notifications = controller.notifications = $scope.notifications = [];

    controller.addNotification = function(info) {
      var id = foundationApi.generateUuid();
      info.id = id;
      notifications.push(info);
    };

    controller.removeNotification = function(id) {
      console.log('test', id);
      angular.forEach(notifications, function(notification) {
        if(notification.id === id) {
          var ind = notifications.indexOf(notification);
          notifications.splice(ind, 1);
          console.log(notifications);
        }
      });
    };

    controller.clearAll = function() {
      notifications = [];
    };

}]);

angular.module('foundation.notification')
  .directive('faNotificationSet', ['FoundationApi', function(foundationApi) {
  return {
    restrict: 'EA',
    templateUrl: '/partials/notification-set.html',
    controller: 'FaNotificationController',
    link:function(scope, element, attrs, controller) {
      foundationApi.subscribe(attrs.id, function(msg) {
        if(msg === 'clearall') {
          controller.clearAll();
        } else {
          controller.addNotification(msg);
        }

        scope.$apply();
      });

    },
  };
}]);

angular.module('foundation.notification')
  .directive('faNotification', function() {
  return {
    restrict: 'EA',
    templateUrl: '/partials/notification.html',
    replace: true,
    transclude: true,
    require: '^faNotificationSet',
    controller: function() { },
    scope: {
      title: '=?',
      content: '=?',
      image: '=?',
      notifId: '=',
      onEnter: '&?',
      onExit: '&?'
    },
    link: function(scope, element, attrs, controller) {
      scope.active = true;

      if(scope.onEnter) {
        scope.onEnter();
      }

      console.log(attrs.notifId, 'attrs');
      console.log(scope.notifId, 'scope');

      scope.remove = function() {
        if(scope.onExit) { scope.onExit(); }
        controller.removeNotification(scope.notifId);
      };
    },
  };
});

angular.module('foundation.notification')
  .directive('faNotificationStatic', ['FoundationApi', function(foundationApi) {
  return {
    restrict: 'EA',
    templateUrl: '/partials/notification.html',
    replace: true,
    transclude: true,
    scope: {
      title: '@?',
      content: '@?',
      image: '@?',
      onEnter: '&?',
      onExit: '&?'
    },
    link: function(scope, element, attrs, controller) {

      foundationApi.subscribe(attrs.id, function(msg) {
        if(msg == 'show' || msg == 'open') {
          scope.show();
        } else if (msg == 'close' || msg == 'hide') {
          scope.hide();
        } else if (msg == 'toggle') {
          scope.toggle();
        }

        scope.$apply();

        return;
      });

      scope.hide = function() {
        scope.active = false;
        return;
      };

      scope.remove = function() { scope.hide(); };

      scope.show = function() {
        scope.active = true;
        return;
      };

      scope.toggle = function() {
        scope.active = !scope.active;
        return;
      };

    },
  };
}]);

angular.module('foundation.notification')
  .directive('faNotify', ['FoundationApi', function(foundationApi) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs, controller) {
      element.on('click', function(e) {
        foundationApi.publish(attrs.faNotify, { title: 'Test', content: 'Test2' });
        e.preventDefault();
      });
    },
  };
}]);
