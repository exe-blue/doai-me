/**
 * DoAi.Me Intient Agent
 * Runs on Galaxy S9 via AutoX.js
 */
"auto";

var CONFIG = {
    taskId: $env.TASK_ID,
    videoUrl: $env.VIDEO_URL,
    duration: parseInt($env.TARGET_DURATION) || 60,
    actions: {
        like: $env.SHOULD_LIKE === 'true' || $env.SHOULD_LIKE === true,
        comment: $env.SHOULD_COMMENT === 'true' || $env.SHOULD_COMMENT === true,
        commentText: $env.COMMENT_TEXT,
        subscribe: $env.SHOULD_SUBSCRIBE === 'true' || $env.SHOULD_SUBSCRIBE === true
    },
    callbackUrl: $env.CALLBACK_URL
};

console.log("Task Started: " + CONFIG.taskId);

var RESULT = {
    duration: 0,
    liked: false,
    commented: false,
    commentText: null,
    subscribed: false
};

function openVideo(url) {
    app.startActivity({
        action: "android.intent.action.VIEW",
        data: url,
        packageName: "com.google.android.youtube"
    });
    waitForPackage("com.google.android.youtube", 10000);
    
    if (currentPackage() !== "com.google.android.youtube") {
        throw new Error("YouTube failed to launch");
    }
    sleep(5000); // Load wait
}

function watch(targetSeconds) {
    var startTime = Date.now();
    var slept = 0;
    while (slept < targetSeconds) {
        sleep(5000);
        slept += 5;
        // Keep screen on / Anti-bot
        if (Math.random() < 0.1) press(device.width / 2, device.height / 2, 10);
    }
    RESULT.duration = Math.floor((Date.now() - startTime) / 1000);
}

function performLike() {
    if (!CONFIG.actions.like) return;
    try {
        var likeBtn = descContains("Like").findOne(2000) || descContains("좋아요").findOne(2000);
        if (likeBtn) {
            if (!likeBtn.isSelected()) {
                likeBtn.click();
                RESULT.liked = true;
                console.log("Liked video");
                sleep(1000);
            } else {
                RESULT.liked = true; // Already liked
            }
        }
    } catch (e) {
        console.error("Like failed: " + e);
    }
}

function performSubscribe() {
    if (!CONFIG.actions.subscribe) return;
    try {
        var subBtn = textMatches(/(Subscribe|구독)/).findOne(3000) || descMatches(/(Subscribe|구독)/).findOne(3000);
        if (subBtn) {
            var txt = subBtn.text() || subBtn.desc();
            if (txt.match(/(Subscribed|구독중)/)) {
                RESULT.subscribed = true;
            } else {
                subBtn.click();
                RESULT.subscribed = true;
                console.log("Subscribed to channel");
                sleep(2000);
            }
        }
    } catch (e) {
        console.error("Subscribe failed: " + e);
    }
}

function performComment() {
    if (!CONFIG.actions.comment || !CONFIG.actions.commentText) return;
    try {
        var commentsHeader = textMatches(/(Comments|댓글)/).findOne(5000);
        if (commentsHeader) {
            commentsHeader.click();
            sleep(3000);
            
            var inputField = textMatches(/(Add a comment|댓글 추가)/).findOne(5000) || descMatches(/(Add a comment|댓글 추가)/).findOne(5000);
            if (inputField) {
                inputField.click();
                sleep(1000);
                setText(CONFIG.actions.commentText);
                sleep(1000);
                
                var sendBtn = descMatches(/(Send|전송|Submit|등록)/).findOne(3000) || textMatches(/(Send|전송|Submit|등록)/).findOne(3000);
                if (sendBtn) {
                    sendBtn.click();
                    RESULT.commented = true;
                    RESULT.commentText = CONFIG.actions.commentText;
                    console.log("Comment posted");
                    sleep(3000);
                }
                back(); // Close comments
            } else {
                back();
            }
        }
    } catch (e) {
        console.error("Comment failed: " + e);
        back(); // Ensure we exit comment view
    }
}

function report(success, logs) {
    console.log("Reporting...");
    try {
        http.postJson(CONFIG.callbackUrl, {
            taskId: CONFIG.taskId,
            success: success,
            logs: logs,
            result: RESULT
        });
    } catch (e) {
        console.error("Report failed: " + e);
    }
}

try {
    openVideo(CONFIG.videoUrl);
    
    watch(CONFIG.duration);
    
    performLike();
    performSubscribe();
    performComment();
    
    report(true, "Completed");
} catch (e) {
    console.error("Error: " + e);
    report(false, e.toString());
}