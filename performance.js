/**Controller Declaration*/
angular.module('hr-appraisal-ui.performance').controller('performanceCtrl', performanceCtrl);

angular.module('hr-appraisal-ui.performance').directive('dannyPackery', ['$rootScope', function($rootScope) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			if($rootScope.packery === undefined || $rootScope.packery === null){
				console.log('making packery!');
				$rootScope.packery = new Packery(element[0].parentElement, {columnWidth: '.item'});
				console.log("$rootScope.packery.items = ", $rootScope.packery.items);
				console.log("element[0] = ", element[0]);
				$rootScope.packery.bindResize();
				//$rootScope.packery.appended(element[0]);
				$rootScope.packery.items.splice(1,1); // hack to fix a bug where the first element was added twice in two different positions

			}
			/*else{
				$rootScope.packery.appended(element[0]);
			}*/

            $rootScope.packery = new Packery(element[0].parentElement, {columnWidth: '.item'});
			//$rootScope.packery.layout();
		}
	};

}]);

/**Dependencies*/
performanceCtrl.$inject = ['performanceService', '$scope', '$rootScope', '$translate', '$timeout', 'userService', '$log', '$anchorScroll', '$stateParams','$filter'];

/**Controller implementation*/
function performanceCtrl(performanceService, $scope, $rootScope,$translate , $timeout, userService, $log, $anchorScroll, $stateParams,$filter) {
    /******************Initialization *******************/
    var vm = this;

    var collaboratorId = $stateParams.collaboratorId;
    var selectedYear;
    vm.performanceThread = [];
    vm.overallAppraisalSummary = [];
    vm.performanceEvaluation = [];
    vm.collaboratorAppraisalComment = [];

    vm.onSelectYear = onSelectYear;
    vm.isSelectedYear = isSelectedYear;
    vm.selectedYear = selectedYear;
    $scope.currentDate =  new Date().getTime();

    // Objective data
    vm.list_objectives=[];
    vm.editingObjective ={};
    vm.editingObjectiveOrigin = {};
    vm.newObjective = {};
    vm.ObjectiveEditionMode = false;
    vm.ObjectiveAddMode = false;
    vm.lastModificationDate="";
    vm.currentAppraisalYear = "";
    vm.isReviewPeriod = false;
    vm.isFullDisplayForAllObjectives = false;
    vm.addObjectiveClick = addObjectiveClick;
    vm.appraisalRatingSet = [
                                {"grade": "6", "gradeLabel": "1- Exerc� de fa�on exeptionnelle"},
                                {"grade": "5", "gradeLabel": "2- Exerc� tr�s au-del� des attandus du poste"},
                                {"grade": "4", "gradeLabel": "3- Exerc� au-del� des attandus du poste"},
                                {"grade": "3", "gradeLabel": "4- Exerc� conform�ment aux attandus du poste"},
                                {"grade": "2", "gradeLabel": "5- Partiellement exerc�"},
                                {"grade": "1", "gradeLabel": "6- Insuffisamment exerc�"}
                            ];


    //TODO en attente d'impl�mentation de m�canisme d'authentification
    initConnectedUser();
    loadPerformanceSummary();

    /******************Public functions *******************/

    vm.addPerformanceThreadItemHandler = addPerformanceThreadItemHandler;
    vm.updatePerformanceThreadItemHandler = updatePerformanceThreadItemHandler;

    vm.goToManagerFeedback = goToManagerFeedback;
    vm.goToEvaluation = goToEvaluation;
    vm.goToObjectiv = goToObjectiv;
    vm.backToTop = backToTop;
    vm.addPerformanceAppraisalItem = addPerformanceAppraisalItem;
    vm.updatePerformanceAppraisalItem=updatePerformanceAppraisalItem;
    vm.addAppraisalCommentItem=addAppraisalCommentItem;
    vm.updateAppraisalCommentItem=updateAppraisalCommentItem;
    vm.overallAppraisalSummary ;
    vm.collaboratorAppraisalComment;
    $scope.reviewRange;
    /*$rootScope.portal2appraisal_info={ 'manager': {'uid':'B25421','firstName':'Carole','lastName':'Bouquet'}  ,
                                       'visited_collab':{'uid':'A12345','firstName':'Ana','lastName':'Briska'} };*/


    // Objective functions
    vm.editObjective = editObjective;
    vm.saveObjective = saveObjective;
    vm.updateObjective = updateObjective;
    vm.cancelObjectiveEdition = cancelObjectiveEdition;
    vm.toggleFullDisplayForAllObjectives = toggleFullDisplayForAllObjectives
    vm.toggleExpand = toggleExpand;
    vm.cancelObjectiveAdd = cancelObjectiveAdd;

    /******************Functions *******************/

    function toggleFullDisplayForAllObjectives(){
        vm.isFullDisplayForAllObjectives = !vm.isFullDisplayForAllObjectives ;

         vm.list_objectives = vm.list_objectives.map(function(item){
            item.fullDisplay = vm.isFullDisplayForAllObjectives;
            return item;
        });

        refreshPackery(500);
    }

    function toggleExpand(elmt){
         elmt.fullDisplay=! elmt.fullDisplay;

         var totalState=undefined;
         if(elmt.fullDisplay){
            totalState = true;
         }else{
             vm.list_objectives.forEach(function(item){
                  if(!totalState){
                     totalState=item.fullDisplay;
                 }else{
                     totalState=totalState && item.fullDisplay;
                 }
             });
         }

       vm.isFullDisplayForAllObjectives=  totalState;

        refreshPackery(300);
    }


    function refreshPackery(duration){
        $timeout(function(){
        if( $rootScope.packery){
             $rootScope.packery.layout();
        }

            },duration
        );
    }

    function editObjective(objective){
        vm.ObjectiveEditionMode = true;
        function findObjectiveById(element){
            return element.id === objective.id
        }
        vm.editingObjectiveOrigin = vm.list_objectives.find(findObjectiveById);
        vm.editingObjective = angular.copy(vm.editingObjectiveOrigin);

        refreshPackery(1000);
        $log.debug("vm.editingObjective =", vm.editingObjective );
    }

    function cancelObjectiveEdition(){
        vm.ObjectiveEditionMode = false;
        vm.editingObjective = {};
        refreshPackery(500);
        refreshPackery(250); // fix bug after update objective to reposition
    }

    function cancelObjectiveAdd(){
        vm.ObjectiveAddMode = false;
        refreshPackery(150);
        refreshPackery(1000);
    }

    function updateObjective(){
        var objectiveToUpdate = {"id":vm.editingObjective.id,"name":vm.editingObjective.name, "description":vm.editingObjective.description};
        var objective=performanceService.updateObjective(objectiveToUpdate,collaboratorId,selectedYear);
        objective.then(
            function(response){
               $log.debug("UPDATE OBJECTIVE OK");
               vm.ObjectiveEditionMode = false;
               vm.editingObjectiveOrigin.id = vm.editingObjective.id;
               vm.editingObjectiveOrigin.name = vm.editingObjective.name;
               vm.editingObjectiveOrigin.description = vm.editingObjective.description;

               vm.lastModificationDate = new Date();
               $log.debug("vm.lastModificationDate = ",vm.lastModificationDate);
               vm.editingObjective={};

               refreshPackery(500);
               refreshPackery(250); // fix bug after update objective to reposition
            },
            function (error) {
                $log.error('>>>>error while updating objective :', error);
            }
        );
    }

    function addObjectiveClick(){
        vm.ObjectiveAddMode = true;
        $log.debug("$rootScope.packery = ", $rootScope.packery.items);
        $rootScope.packery.appended(document.querySelector("#addObjectiveBlock"));
        $rootScope.packery.reloadItems();
        refreshPackery(100);
    }

    function saveObjective(){
        $log.debug("newObjective==>",vm.newObjective);
        var objective=performanceService.saveObjective(vm.newObjective,collaboratorId,selectedYear);
        objective.then(
            function(response){
                vm.newObjective.id = response.data.createdResourceId;
                vm.list_objectives.push(vm.newObjective);
                vm.ObjectiveAddMode = false;
                vm.newObjective = {};

                vm.lastModificationDate = new Date();

                refreshPackery(500);
                refreshPackery(250);
            },
            function (error) {
                $log.error('>>>>error while adding objective :', error);
            }
        );
    }

    //TODO en attente d'impl�mentation de m�canisme d'authentification
    function initConnectedUser() {
        userService.getConnectedUser(function(connectedUser) {
            $scope.connectedUser = connectedUser;
            $log.debug("connectedUser = ", connectedUser);
            $scope.isManagerView = collaboratorId !== connectedUser.uid;
        });
    }

    function loadPerformanceSummary() {
        var local = $translate.use();
        local=local.toUpperCase();
        return performanceService.getPerformanceSummary(collaboratorId, selectedYear, local).then(

            function (response) {
                vm.performanceThread = response.data.performanceThread;
                $log.debug("response.data=", response.data);
                vm.list_objectives = response.data.objective.list;
                vm.editingObjective = {};
                $log.debug("vm.edittingObjective = ", vm.editingObjective);

                // Add technical wrapper
                vm.list_objectives = vm.list_objectives.map(function(item){
                    item.fullDisplay = false;
                    return item;
                });
                vm.isFullDisplayForAllObjectives = false;

                $log.debug("vm.list_objectives = ",vm.list_objectives);

                refreshPackery(500);

                vm.lastModificationDate = response.data.objective.globalLastModificationDate == '' ? null : new Date(response.data.objective.globalLastModificationDate);
                vm.isReviewPeriod = response.data.reviewDate.isReviewPeriod;
                $scope.reviewRange=response.data.reviewDate;
                $scope.reviewRange.startReviewDate=string2Epoch($scope.reviewRange.startReviewDate);
                $scope.reviewRange.endReviewDate=string2Epoch($scope.reviewRange.endReviewDate);
                vm.overallAppraisalSummary = response.data.overallAppraisalSummary;
                vm.collaboratorAppraisalComment = response.data.collaboratorAppraisalComment;
                //vm.isReviewPeriod = response.data.objective.isReviewPeriod;

                // if load for defaultAppraisalYear (selectedYear == undefined), we initialize selectedYear by defaultAppraisalYear
                if (!selectedYear) {
                    selectedYear = response.data.year;
                    vm.currentAppraisalYear = response.data.year;
                    initializeYearsSelection(selectedYear);
                }
            },
            function (error) {
                $log.error('>>>>error while load general feedbacks:', error);
                /*vm.list_objectives=[
                        {"id":{value:"1"},"name":'Objectif001',"description":'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Libero, temporibus.',"nature":'manager'},
                        {"id":{value:"2"},"name":'Objectif002',"description":'Lorem ipsum dolor sit amet.',"nature":'enforced'},
                        {"id":{value:"3"},"name":'Objectif003',"description":'',"nature":'manager'}
                ];*/
            });

    }

    function addPerformanceThreadItemHandler(performanceThreadItem) {
        if ($scope.isManagerView) {
            return performanceService
                .saveOverallFeedback(performanceThreadItem, collaboratorId, selectedYear);
        }
        return performanceService
            .saveComment(performanceThreadItem, collaboratorId, selectedYear);
    }

    function updatePerformanceThreadItemHandler(performanceThreadItem) {
        if ($scope.isManagerView) {
            return performanceService
                .updateOverallFeedback(performanceThreadItem, collaboratorId);
        }
        return performanceService
            .updateComment(performanceThreadItem, collaboratorId);
    }

/***** Evalutaion section****** */
 function addPerformanceAppraisalItem(performanceAppraisalItem) {
                 return performanceService
                .saveOverallAppraisal(performanceAppraisalItem, collaboratorId, selectedYear).then(function(result){
                // vm.overallAppraisalSummary.overallAppraisal.appraisalRating  =performanceAppraisalItem.appraisalRating;
                //vm.overallAppraisalSummary.overallAppraisal.creationDate= $filter('date')(new Date(), 'dd/MM/yyyy');
                loadPerformanceSummary();
                }); ;
    }

     function updatePerformanceAppraisalItem(performanceAppraisalItem) {
                 return performanceService
                .updateOverallAppraisal(performanceAppraisalItem, collaboratorId, selectedYear).then(function(result){
                // loadPerformanceSummary();
                  vm.overallAppraisalSummary.overallAppraisal.appraisalRating   =performanceAppraisalItem.appraisalRating;
                  vm.overallAppraisalSummary.overallAppraisal.appraisalSummary = performanceAppraisalItem.appraisalSummary;
                  vm.overallAppraisalSummary.overallAppraisal.modificationDate= $filter('date')(new Date(), 'dd/MM/yyyy');
                });
    }

     function addAppraisalCommentItem(performanceAppraisalCommentItem) {  
         alert("performanceAppraisalCommentItem :: " + performanceAppraisalCommentItem) ;
                       return performanceService
                .saveAppraisalComment(performanceAppraisalCommentItem, collaboratorId, selectedYear).then(function(result){
                    loadPerformanceSummary();
                }); ;
    }

      function updateAppraisalCommentItem(performanceAppraisalCommentItem) {
                 return performanceService
                .updateAppraisalComment(performanceAppraisalCommentItem, collaboratorId, selectedYear).then(function(result){
                 loadPerformanceSummary();
                }); ;
    }

    // function addPerformanceAppraisalItem(performanceAppraisalItem) {
    //     $log.debug("===> in performance add item action");
    //     $log.debug("===> performanceAppraisalItem", performanceAppraisalItem);
    // }

    function goToManagerFeedback() {
        $anchorScroll('feedbackManager');
    }

    function goToEvaluation() {
            $anchorScroll('evaluation');
        }

    function goToObjectiv() {
        $anchorScroll('objectifs');
    }

    function backToTop() {
        $anchorScroll();
    }

    function initializeYearsSelection(currentAppraisalYear) {
        vm.selectedYear = selectedYear;
        vm.defaultYearToDisplay = [currentAppraisalYear + 1, currentAppraisalYear, currentAppraisalYear - 1];
        vm.hitoryYearToDisplay = [currentAppraisalYear - 2, currentAppraisalYear - 3, currentAppraisalYear - 4, currentAppraisalYear - 5];
    }

    function isSelectedYear(aYear) {
        return selectedYear == aYear;
    }

    function onSelectYear(aSelectedYear) {
        selectedYear = aSelectedYear;
         vm.selectedYear =selectedYear;
        loadPerformanceSummary();

        // Reset objective edition and add mode
        vm.ObjectiveAddMode = false;
        vm.ObjectiveEditionMode = false;
    }

    $scope.isPast5YearsOpen = false;
    $scope.togglePast5Years = function () {
        $scope.isPast5YearsOpen = !$scope.isPast5YearsOpen;
    }

    function string2Epoch(dateString){

        var from = dateString.split("/");
        var f = new Date(from[2], from[1]-1, from[0]);

        return f.getTime()+86400*1000;
    }

    function stringToTimestamp(StringDate){        
        return (StringDate!='' && StringDate.length!=0) ? new Date(StringDate).getTime() : '';
    }

}



