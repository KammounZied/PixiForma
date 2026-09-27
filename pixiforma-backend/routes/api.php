<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserRoleController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\GroupRequestController;
use App\Http\Controllers\PublicationController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\FormationController;
use App\Http\Controllers\FormationBlockRequestController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\StatsController;

/* ====== Authentication =======*/
Route::post('register', [AuthController::class, 'register'])->name('register');
Route::post('login', [AuthController::class, 'login'])->name('login');
Route::post('refresh', [AuthController::class, 'refresh'])->name('refresh');
Route::post('forgot-password', [\App\Http\Controllers\PasswordController::class, 'forgotPassword'])->name('password.email');
Route::post('reset-password', [\App\Http\Controllers\PasswordController::class, 'resetPassword'])->name('password.store');
Route::post('verify-reset-token', [\App\Http\Controllers\PasswordController::class, 'verifyToken']);

Route::middleware('auth:api')->group(function () {

    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('/user', [UserController::class, 'me']);

    Route::post('/users/change-password', [UserController::class, 'changePassword']);

    Route::get('/users', [UserController::class, 'index']);

    Route::post('/users/invite', [UserController::class, 'invite'])
        ->middleware('role:Admin');

    Route::put('/users/{user}/role', [UserRoleController::class, 'assign'])
        ->middleware('role:Admin');

    Route::put('/users/{user}', [UserController::class, 'update'])
        ->middleware('role:Admin');

    Route::put('/users/{user}/toggle-status', [UserController::class, 'toggleStatus'])
        ->middleware('role:Admin');

    Route::delete('/users/{user}', [UserController::class, 'destroy'])
        ->middleware('role:Admin');

    Route::get('/roles', [RoleController::class, 'index'])
        ->middleware('role:Admin');

    Route::put('/roles/{role}/permissions/toggle', [RoleController::class, 'togglePermission'])
        ->middleware('role:Admin');

    // Groups
    Route::get('/groups', [GroupController::class, 'index']);

    Route::post('/groups', [GroupController::class, 'store'])
        ->middleware('role:Formateur|Admin');

    Route::get('/groups/{group}', [GroupController::class, 'show']);

    Route::put('/groups/{group}', [GroupController::class, 'update'])
        ->middleware('role:Formateur|Admin');

    Route::delete('/groups/{group}', [GroupController::class, 'destroy'])
        ->middleware('role:Formateur|Admin');

    Route::get('/groups/{group}/members', [GroupController::class, 'members']);

    Route::delete('/groups/{group}/members/{user}', [GroupController::class, 'removeMember'])
        ->middleware('role:Formateur|Admin');

    Route::post('/groups/{group}/leave', [GroupController::class, 'leaveGroup']);

    // Invitations
    Route::get('/invitations', [InvitationController::class, 'index']);

    Route::post('/groups/{group}/invitations', [InvitationController::class, 'send'])
        ->middleware('role:Formateur|Admin');

    Route::put('/invitations/{invitation}/accept', [InvitationController::class, 'accept']);

    Route::put('/invitations/{invitation}/decline', [InvitationController::class, 'decline']);

    // Collaborators
    Route::get('/users/collaborators', [UserController::class, 'collaborators'])
        ->middleware('role:Formateur|Admin');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);

    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    Route::post('/notifications/delete', [NotificationController::class, 'destroyMultiple']);

    // Group requests
    Route::get('/groups/available', [GroupRequestController::class, 'availableGroups']);

    Route::get('/group-requests/mine', [GroupRequestController::class, 'myRequests']);

    Route::post('/groups/{group}/request-join', [GroupRequestController::class, 'requestJoin']);

    Route::get('/group-requests/pending', [GroupRequestController::class, 'pendingRequests'])
        ->middleware('role:Formateur|Admin');

    Route::put('/group-requests/{groupRequest}/approve', [GroupRequestController::class, 'approve'])
        ->middleware('role:Formateur|Admin');

    Route::put('/group-requests/{groupRequest}/decline', [GroupRequestController::class, 'decline'])
        ->middleware('role:Formateur|Admin');

    // Publications
    Route::get('/groups/{group}/publications', [PublicationController::class, 'index']);

    Route::post('/groups/{group}/publications', [PublicationController::class, 'store'])
        ->middleware('role:Formateur|Admin');

    Route::get('/groups/{group}/publications/{publication}', [PublicationController::class, 'show']);

    Route::post('/groups/{group}/publications/{publication}', [PublicationController::class, 'update'])
        ->middleware('role:Formateur|Admin');

    Route::delete('/groups/{group}/publications/{publication}', [PublicationController::class, 'destroy'])
        ->middleware('role:Formateur|Admin');

    Route::delete('/publications/files/{publicationFile}', [PublicationController::class, 'destroyPublicationFile'])
        ->middleware('role:Formateur|Admin');

    // File serving (authenticated access)
    Route::get('/publications/{publication}/files/{publicationFile}', [PublicationController::class, 'servePublicationFile']);

    // Comments
    Route::get('/publications/{publication}/comments', [CommentController::class, 'index']);

    Route::post('/publications/{publication}/comments', [CommentController::class, 'store']);

    Route::put('/publications/{publication}/comments/{comment}', [CommentController::class, 'update']);

    Route::delete('/publications/{publication}/comments/{comment}', [CommentController::class, 'destroy']);

    // ─── Formations ───
    Route::get('/groups/{group}/formations', [FormationController::class, 'index']);

    Route::post('/groups/{group}/formations', [FormationController::class, 'store'])
        ->middleware('role:Formateur|Admin');

    Route::get('/formations/{formation}', [FormationController::class, 'show']);

    Route::put('/formations/{formation}', [FormationController::class, 'update'])
        ->middleware('role:Formateur|Admin');

    Route::delete('/formations/{formation}', [FormationController::class, 'destroy'])
        ->middleware('role:Formateur|Admin');

    Route::post('/formations/{formation}/publications', [FormationController::class, 'assignPublications'])
        ->middleware('role:Formateur|Admin');

    Route::delete('/formations/{formation}/publications/{publication}', [FormationController::class, 'removePublication'])
        ->middleware('role:Formateur|Admin');

    Route::put('/formations/{formation}/publications/reorder', [FormationController::class, 'reorderPublications'])
        ->middleware('role:Formateur|Admin');

    Route::put('/formations/{formation}/visibility', [FormationController::class, 'toggleVisibility'])
        ->middleware('role:Formateur|Admin');

    Route::post('/formations/{formation}/assign', [FormationController::class, 'assignLearners'])
        ->middleware('role:Formateur|Admin');

    Route::get('/formations/{formation}/learners', [FormationController::class, 'learnerProgress'])
        ->middleware('role:Formateur|Admin');

    Route::get('/formations/{formation}/my-progress', [FormationController::class, 'myProgress']);

    Route::post('/formations/{formation}/my-progress', [FormationController::class, 'startMyProgress']);

    Route::post('/formations/{formation}/unblock/{user}', [FormationController::class, 'unblockLearner'])
        ->middleware('role:Formateur|Admin');

    // Block requests
    Route::post('/formations/{formation}/block-requests', [FormationBlockRequestController::class, 'store']);

    Route::get('/formations/{formation}/block-requests/check', [FormationBlockRequestController::class, 'check']);

    Route::get('/formations/{formation}/block-requests', [FormationBlockRequestController::class, 'index'])
        ->middleware('role:Formateur|Admin');

    Route::put('/block-requests/{blockRequest}/approve', [FormationBlockRequestController::class, 'approve'])
        ->middleware('role:Formateur|Admin');

    Route::put('/block-requests/{blockRequest}/decline', [FormationBlockRequestController::class, 'decline'])
        ->middleware('role:Formateur|Admin');

    Route::put('/block-requests/{blockRequest}/pass', [FormationBlockRequestController::class, 'pass'])
        ->middleware('role:Formateur|Admin');

    // ─── Quizzes ───
    Route::post('/formations/{formation}/publications/{publication}/generate-quiz', [QuizController::class, 'generateQuiz'])
        ->middleware('role:Formateur|Admin');

    Route::get('/formations/{formation}/publications/{publication}/quiz', [QuizController::class, 'getQuizForPublication']);

    Route::get('/formations/{formation}/publications/{publication}/quiz/review', [QuizController::class, 'getQuizForReview'])
        ->middleware('role:Formateur|Admin');

    Route::get('/quizzes/{quiz}/status', [QuizController::class, 'getQuizStatus']);

    Route::get('/quizzes/{quiz}/questions', [QuizController::class, 'getQuizQuestions'])
        ->middleware('role:Formateur|Admin');

    Route::patch('/quizzes/{quiz}/toggle-question/{index}', [QuizController::class, 'toggleQuestion'])
        ->middleware('role:Formateur|Admin');

    Route::post('/quizzes/{quiz}/publish', [QuizController::class, 'publishQuiz'])
        ->middleware('role:Formateur|Admin');

    Route::post('/quizzes/{quiz}/regenerate', [QuizController::class, 'regenerateQuiz'])
        ->middleware('role:Formateur|Admin');

    Route::post('/quizzes/{quiz}/submit', [QuizController::class, 'submitQuiz']);

    Route::post('/publications/{publication}/convert-pdfs', [QuizController::class, 'convertPdfs'])
        ->middleware('role:Formateur|Admin');

    Route::get('/publications/{publication}/markdown-status', [QuizController::class, 'checkMarkdownStatus']);

    // ─── IA Summary ───
    Route::post('/publications/{publication}/generate-summary', [PublicationController::class, 'generateSummary'])
        ->middleware('role:Formateur|Admin');
    Route::get('/publications/{publication}/summary-status', [PublicationController::class, 'getSummaryStatus']);
    Route::get('/publications/{publication}/summary', [PublicationController::class, 'getSummary']);
    Route::get('/publications/{publication}/summary/pdf', [PublicationController::class, 'downloadSummaryPdf']);

    // ─── Stats ───
    Route::get('/stats/my-progress', [StatsController::class, 'myProgress']);

    Route::get('/stats/my-formations', [StatsController::class, 'myFormations'])
        ->middleware('role:Formateur|Admin');

    Route::get('/formations/{formation}/stats', [StatsController::class, 'formationStats'])
        ->middleware('role:Formateur|Admin');
});