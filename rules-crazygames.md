#AS START WE FOUCS ON Basic Implementation

Technical 	

    Initial download size ≤ 50MB
    Total file size ≤ 250MB (50MB without SDK)
    File count ≤ 1500

Gameplay 	

    Basic visual QA checks
    Adhere to PEGI12

Advertisement 	

    CrazyGames monetization is disabled
    No external ads


Account integration
Only when applicable 	
    No external login options

Multiplayer
Only when applicable 	
    Full implementation features might increase engagement and are optional in basic launch


In-game Purchases
Invite Only 	
    Not available

#Quality guidelines

This page describes a number of guidelines to publish a succesful game on the CrazyGames platform. The guidelines should be used alongside our mandatory requirements.

Whether a game is "good" or "bad" can often be subjective, but there are best practices learned from our experiences with successful games. The following list is non-exhaustive.
Onboarding

For a game to be successful it is crucial that users get to gameplay quickly, understand what the game is about and how to control it. A good onboarding is paramount to make this possible:

    Provide a simple onboarding phase where new users land directly.
        Implement the onboarding in gameplay.
        Focus on the core functionality so users can start playing, avoid explaining every single feature.
        Make the onboarding phase skippable.
    Prioritize visuals and limit the use of text for onboarding.
    Show the user how to control the game with a keyboard overlay or mouse gestures. See Restricted Keys for more info.
    Make sure the UI is clear.
        Buttons are clearly labeled to indicate how to proceed.
        Buttons are not sized to encourage ads or other behaviors.
        Buttons do not have delays to confuse users or encourage other behaviors.

General principles

Once a user is onboarded into the game, here are some general principles for web games:

    There are clear goals that the player can reach.
    The game is easy to learn.
    The game is easy to understand — the language is correct and clear, well translated, or the game makes good use of universal graphics prompts.
    The controls are consistent and intuitive throughout the game.

What makes your game a fun experience?

Attributes of a web game that adheres to best practices:

    The game responds quickly to the player's actions.
    The challenge, strategy, and game story are balanced and well-paced.
    The display layout is comfortable and intuitive.
    The audio is comfortable and appropriate for the game.
    The game interface is designed for the user's device (desktop and optionally mobile).
    Various player segments can enjoy the game.
    The game story or scenarios are interesting where applicable.
    There are no overly repetitive or "boring" tasks in the game.
    The game processes information quickly to give players a feeling of smooth flow and continuity.
    Solo play and playing with friends:
        Playing alone is as prominent as playing with friends if both are offered.
        If playing alone is not available, the game clearly explains that.

Is your game unique?

Attributes of a web game that adheres to best practices:

    It should be easy to improve or modify the game to add new content like new levels, art, story elements, etc.
    Major features such as the game's genre should not change after submission.
    The game should be frequently maintained and updated.
    The game is not easily confused with another that features a similar name or iconography.
    The game does not use a common identifier unless the game developer owns the respective IP.
        E.g. the name “Super Chess” is unique and clear, while simply “Chess” is not.
        The name “Scrabble” is clear and unique, but can only be used by the IP holder.

Is your game aesthetically pleasing?

Attributes of a web game that adheres to best practices:

    Graphics should be of high quality.
        High resolution — quality games are visually pleasing.
        Quality games have consistent resolution throughout the game.
        Quality games are free of graphical defects like compression artifacts.
    Audio should be of high quality
        Audio levels are consistent.
        Sounds aren't too loud or quiet
        Any music in the game complements the visual experience

In addition to having no technical graphical issues, the game is internally consistent, coherent, and has attractive visuals. The games aesthetic style should remain consistent and not switch between looks i.e. moving from realistic to cartoony, or high resolution to low resolution.

The game is clear about what it is. It isn't misleading and is clear about what genre and type of game it is overall. The name and imagery presented on CrazyGames should reflect accurately the type of game the player will experience. The game only changes its name and associated imagery where totally necessary, such as when a significant update or visual overhaul of the game takes place.
Restricted Keys

    It's important that the game controls are intuitive and easy to learn.
    Preferably make your key bindings adapt to the user's keyboard layout, rather than requiring the user to change their own bindings.
        Note that in some countries, like France, the standard keyboard has AZERTY layout, and the typical WASD keys for movement are ZQSD on that layout.
    Avoid common keys that have other behaviour on web:
        Escape closes fullscreen
        Ctrl / Cmd + W closes the tab; you can disable this when the user is in fullscreen


Technical requirements

File Size & Count Limits

A key factor of a web game's success is the time it takes for a user to start playing. This is why we enforce strict file size limits.

    Basic Implementation A maximum total file size of 250MB is allowed. There's a file count limit on 1500 files as high file counts will make loading slower.
    Basic Implementation The game must have an initial download size ≤ 50MB. In order to be eligible for the mobile homepage, the initial download size needs to be ≤ 20MB.
        When the SDK is integrated (optional for basic implementation, mandatory for full implementation), the initial download size is measured between the start of loading and the occurence of the first Gameplay start event triggered through the Game module. This event should be triggered when the user enters in a playable state, so excludes menus and additional loading steps.
        In case the SDK is not integrated, total file size is used and thus should be ≤ 50MB (20MB to be eligible for the mobile home page).
        For externally hosted/loaded files our QA team will evaluate based on the time it takes to reach gameplay (≤ 20 seconds).
    Use only relative paths when referring to other files in the game bundle. Never use absolute paths, as they will fail to load (see here for additional information).

Refer to our Resources section and specifically to our Unity custom build feature for optimization guidelines.
Device & browser compatibility

Basic Implementation

    We expect games to work on Chrome and Edge. Games that don't work well on Safari will be disabled on that browser.
    A significant segment of the CrazyGames audience uses Chromebook. Games will be disabled on Chromium OS if they do not work smoothly on a 4GB RAM device.
    Game supports mouse, keyboard, and touch if mobile is supported.
    Game should be playable in landscape mode on desktop. We allow vertical/portrait games to be published, especially if they are mobile friendly, either with displaying black bars or background images around on the sides.
    CrazyGames has advanced device detection capabilities to distinguish desktop/mobile/tablet, OS browser and application type. We strongly recommend to rely on our system info to implement a device-specific experience.

Mobile game requirements

    In order to be eligible for the mobile homepage, the initial download size can not exceed 20MB.
    You can configure supported orientation in your submission. The website will make sure your game can be played only in those orientations, by asking the users to rotate their devices. Thus, you don't need to implement any orientation lock logic.

    When playing on some devices like tablets for example, double tapping, or pressing and holding can show the magnification tool, or it can select the entire game and show a contextual menu. To prevent frustration, this CSS should be added to the body of your game:

    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    Unity games will be disabled on iOS by default due to frequent crashes (caused by memory shortage). Once your game reaches sufficient plays our team will evaluate the game on iOS and consider enabling it.
    Mobile games should also work well inside the CrazyGames App, where games open in fullscreen and can be affected by device safe areas such as rounded corners, notches, and dynamic islands. See the CrazyGames App guide for app detection, safe area padding, and in-app purchase guidance.
    We manage Unity graphics quality (Device Pixel Ratio) to ensure good game performance for users:
        For iOS devices and low memory Android devices, we choose DPR value of 1 because these devices crash with higher natively supported DPR
        For other devices the native DPR supported by the device is used (window.devicePixelRatio)
        We can overwrite this configuration manually if we think an exception is needed

Resuming audio after iOS interrupts it
Problem

Android keeps the AudioContext in a running state when a user moves to a different app (while still silencing the audio).

On iOS, the AudioContext enters an interrupted state when the app is backgrounded or interrupted by system events like phone calls. iOS therefore requires a proactive approach to restore sound once the user returns.

Some game engines / audio libraries handle this automatically for the developer like Unity. We did notice issues in games using Howler and PlayCanvas.
Solution

The context often transitions to suspended when the app is foregrounded. To revive the audio, developers must call the resume() method within a valid user-initiated gesture, such as a touchend or click event. Simply listening for a visibility change is insufficient, as WebKit restricts audio playback until a direct interaction occurs.

document.addEventListener("touchend", () => {
    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume();
    }
});

The AudioContext is created by the developer’s game (or library). For example when using Howler it will be at Howler.ctx, in PlayCanvas it’s at pc.app.soundManager.context.
SDK Integration

The CrazyGames SDK

For the best user experience and to be able to tap into all value of the CrazyGames platform, integrating the SDK is important. Refer to the appropriate game engine in the side menu.
Basic SDK Integration

Basic Implementation

If you decide to integrate the SDK for a Basic Launch, we require the following:

    A Gameplay start event is triggered from the Game module when the player reaches game state. This is used to measure initial download size.
    Take into account that Ads are not allowed in Basic Launch, and will be disabled even if you would integrate them.

Full SDK Integration

Full Implementation

A full integration of the SDK, involves the basic integration requirements and these additional ones:

    Gameplay start/stop events: allow us to measure and report on gameplay experience
    (if applicable) Data module for saving user game progression - see Progress Save
    (if applicable) User module for account integration and using username/avatar - see Account Integration
    (optional) Load start/stop events: allow us to measure and report on in-game loading times and fail rates

Sitelock & Whitelisting

Basic Implementation

To avoid that your game files are stolen, you might implement a sitelock in your game. Read more about in the SDK docs of your game engine. If you implement a sitelock, you need to take into account that CrazyGames operates on multiple domains. If applicable, make sure to whitelist each of our domains to allow all our users to play.

Read more on our page about Sitelock.

Sitelock

Sitelock helps prevent your HTML5 game from being copied and hosted on unauthorized websites.
Protecting HTML5 games

To prevent your game from being stolen by other websites, check whether the game is running on crazygames.* domains. This is an example domain that should support loading the game: https://cubes-2048-io.game-files.crazygames.com/cubes-2048-io/13/index.html

Your can use this function to ensure your game runs on valid CrazyGames domains.

function isCrazyGames() {
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    const idx = parts.indexOf("crazygames");
    return idx !== -1 && idx >= parts.length - 3;
}

If this check fails, you can show a message such as "Available only on CrazyGames" or render a blank screen.

To improve sitelock robustness, you can obfuscate relevant parts of your game code with a tool like obfuscator.io.
Protecting iframe games

To prevent iframe embedding, configure the CSP header: Content-Security-Policy: frame-ancestors [...]

If you submit your game as an iframe game, keep in mind that CrazyGames has multiple regional domains (for example www.crazygames.no, www.1001juegos.com, www.crazygames.fr). You must whitelist all supported CrazyGames domains:

// General
*.crazygames.com
crazygames.*   // * can be a TLD consisting of 1 or 2 parts like .fr or .com.br

// Exhaustive list
www.crazygames.com
de.crazygames.com
it.crazygames.com
vn.crazygames.com
gr.crazygames.com
ar.crazygames.com
th.crazygames.com

www.crazygames.fr
www.crazygames.co.id
www.crazygames.cz
www.crazygames.dk
www.crazygames.hu
www.crazygames.nl
www.crazygames.no
www.crazygames.pl
www.crazygames.com.br
www.crazygames.ro
www.crazygames.fi
www.crazygames.se
www.crazygames.ru
www.crazygames.com.ua
www.crazygames.at
www.crazygames.jp
www.crazygames.pt
www.crazygames.vn
www.crazygames.com.vn
www.crazygames.co.kr

// video ads run on
games.crazygames.com

//deprecated domains (no longer need whitelisting)
www.1001juegos.com
tr.crazygames.com



Common fixes

The snippet below addresses common UX issues caused by default browser behavior:

    Unwanted page scroll
    Unwanted key events
    Visibility changes on Samsung App
    Context menu appearing outside the Unity canvas

// Disable unwanted page scroll.
window.addEventListener("wheel", (event) => event.preventDefault(), {
    passive: false,
});

// Disable unwanted key events and spacebar scrolling.
window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", ""].includes(event.key)) {
        event.preventDefault();
    }
});

// Fix visibility change handling on webview (reported on Samsung App).
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState) {
        if (document.visibilityState === "hidden") {
            application.publishEvent("OnWebDocumentPause", "True");
        } else if (document.visibilityState === "visible") {
            application.publishEvent("OnWebDocumentPause", "False");
        }
    }
});

// Disable context menu after right click outside the canvas.
document.addEventListener("contextmenu", (event) => event.preventDefault());


Gameplay requirements

This page outlines the requirements that submitted games must meet to ensure a high-quality game experience. While we are not looking for the "perfect" game, our goal is to help players discover your well-crafted game without encountering inappropriate or subpar content. Only games that prioritize quality and gameplay will be allowed on the platform. Developers who repeatedly submit non-compliant games may face restrictions on future submissions.

Our quality guidelines are inspired by the Facebook games.
Basic Gameplay Requirements

Basic Implementation

Our team performs several visual and functional checks on each submitted game. Ensure your game meets the following criteria:

    Readable Content: Text and images must be legible on devices with a devicePixelRatio:1, on responsive iframe sizes (16x9 ratio) and mobile screens (if applicable). These are the most important iframe sizes for our audience:
        907 x 510 px (desktop - non-fullscreen)
        1216 x 684 px (desktop - non-fullscreen)
        1077 x 606 px (desktop - non-fullscreen)
        821 x 462 px (desktop - non-fullscreen)
        1366 x 768 px (desktop - fullscreen)
        1920 x 1080 px (desktop - fullscreen)
        1536 x 864 px (desktop - fullscreen)
        1280 x 720 px (desktop - fullscreen)
        800 x 450 px (mobile)
        1080 x 607 px (tablet)
    Consistent Physics: The game's physics must perform consistently across different monitor refresh rates (e.g. 144 Hz, 165 Hz)
    Language Support:
        The game must have English localization
        If translations are included, they should be accurate and of high quality. The game should use the user's language based on locale info provided through the system info method in our SDK, and if not available/set fallback to English.
    Intuitive controls: The game should have intuitive controls on different types of devices. Have a look at the section about restricted keys
    Smooth Performance: The game must load quickly and play seamlessly without errors or crashes
    Originality: Game names, assets, and overall content should exhibit originality
    Fullscreen Functionality: Fullscreen mode is automatically provided by CrazyGames. Custom in-game fullscreen buttons are prohibited, as they can interfere with other features (e.g. monetization).
    No Cross-Promotion: The game should not include cross-promotions for external or internal games/platforms.
        Exception: Privacy Policy and Terms and Conditions if applicable. Check requirements intro for details.
        Following exceptions are allowed as long as these are not a main CTA on the menu :
            Community links (discord, dev website, ...) are allowed on the game menu only as long they don’t lead directly to a playable web version
            Game Store (Epic, Steam, ...) links to the game on desktop games only on main menu or at the end of a demo game
            Backlinks to CG home or category page are accepted but not promoted
            Links to other game(s) in the same series of games (e.g. Horror Tale 1, 2, 3, …)
        App Store links are never allowed in-game, and should use the configurable game metadata fields in our Developer Portal
    Suited for minors: CrazyGames is a website for an audience aged 13 or more. Your game must be PEGI 12 compliant.
        We host a standalone website dedicated for kids games, yet note that monetization is disabled on that domain.


Advertisement requirements

Full Implementation

Warning

    If your game is currently in the Basic Launch phase:
        Advertisements will be disabled; no revenue will be shared.
        If you did integrate the Ads SDK, our team will check to make sure the game runs smoothly while ads are disabled. The game will be rejected if it does not. For example: Game doesn't freeze between levels. There should not be rewarded ad buttons without effect.
    Only Ads requested through the CrazyGames SDK are allowed.

These types of advertisements are available through the CrazyGames SDK:

    Video ads
        Midgame ads: between levels or stages
        Rewarded ads: when giving a reward (CrazyGames provides fallback banners)
    In-game banners

In-game ads and purchases should provide a meaningful and rich experience for the player and should not appear before the user has experienced a reasonable amount of gameplay. Most importantly, in-game ads should not:

    Interrupt gameplay
    Trigger deceptively
    Chain multiple ads

Video ads

Video

    Video ads can not interrupt gameplay and shouldn't come as a surprise: Advertisements should not be shown while a user is playing. We do not allow disruptive ads since they will scare users away. Instead, show them at a logical point for the user. Examples are during a level transition, a map change when the player died etc. Do not show a midgame ad on a navigational button (e.g. when clicking the main menu icon or opening the settings or opening the shop).
    Your game should be paused during a video ad: Ensure that a user cannot progress the game while requesting or showing an ad. Disable buttons, or show a spinner that blocks interaction. An ad request is not instantaneous: several auctions are held and take some time to return with a reply. Block the UI until either an adFinished or adError event occurs.
    Handle unfilled ad calls correctly: Sometimes, the request for a midgame ad will be unfilled (either because of timing restrictions, adblock, or low demand). In this case you receive an adError event. You should handle this case correctly and ensure that the game continues.
    Your game should be muted during a video ad: Video advertisements have audio. Ensure that your in-game sound and the advertisement audio are not playing together. You should mute your audio whenever an advertisement starts playing, and unmute it when the ad has finished. Only mute the audio when the ad actually starts playing, and not when you request an ad. It is possible no advertisement is available, and muting and unmuting your music without a visual change is not user-friendly.
    Request midgame ads at opportune moments without worrying about frequency or minimum intervals:
        We take care automatically of how often a midgame ad is shown, taking into account the start of the game, the midroll frequency (max 1 every 3 minutes) and interplay with rewarded ads
        If the next midgame ad request is too early, it just gets ignored by the SDK and there is no impact for the user. This means that you can request a midgame ad at any opportune moment in the game without worrying about when the last midgame was shown

Rewarded ads

Rewarded ads should be special opportunities that a user looks forward to, and not an expectation whenever the user plays your game. Poorly designed levels that can only be completed by a rewarded ad are not acceptable. Instead, occasionally give the user the option to watch a rewarded ad that gives them a cool bonus, or a funny cosmetic change.

We have strict requirements to include rewarded advertisements. Before you start implementing please make sure you read them carefully:

Placement and frequency

    Do not offer a rewarded ad too often. Inform the user of this with a timer or hide the ad request button.
    Do not chain multiple ads, i.e. watch more than one rewarded ad to receive a single reward.
    Do not promote the rewarded ads too aggressively. If the game rewarded ads are well-implemented users will want to use them, there is no need to remind them too often.
    The request button should not appear on an active gameplay screen. For example, in a racing game, the request button can't appear during the race.

Reward UI

    The button to request a rewarded ad should be easily accessible in a consistent location.
    The button to request a rewarded ad can not be misleading in any way. Specifically, the continue without watching a rewarded ad should be the same size, font, color, etc.
    It needs to be clear immediately that the reward is optional. Hiding or delaying the skip or close button on the offer is not allowed.
    It needs to be clear for players that they will have to watch an advertisement in exchange for the reward. This can be done by displaying a video icon for example.
    Provide an alternative to watching an ad. For example, a user can also buy the reward with coins that he can receive during the game.

Rewarded ads callbacks

    When the ad has finished (adFinished), make it clear that the player iss rewarded. You can display an animation or a notification.
    When our rewarded ad returns with an adError callback, do NOT reward the player.
        We aim for a high ad fill rate, and provide alternative incentives if no ads are available.
        See below for more info about Ad Blockers.

Rewarded ad examples:
In-game store ads
End-of-game multiplier
Out of lives ads

In-game store ads are a great way to monetize players who are in a "purchase" mindset. You can award monetary value or items they otherwise have to buy.
In-game banner ads

Banner

    In-game banners are only allowed on useful screens with content that are open for at least 5 seconds on average.
    Make sure that in-game banners do not block any game UI on all game sizes (including on mobile).
    Do not show in-game banners during game-play.
    In-game banners must be clearly distinguishable from game content.
    A maximum of 2 in-game banners may be displayed on the same screen/view, provided that the overall user experience remains clear, non-intrusive, and user-friendly.
    In-game banners can have a performance impact and may negatively affect the user experience, which can reduce the overall quality and usability of the game.

Adblockers

Full Implementation

We strive to limit the use of adblockers on the CrazyGames platform, by disabling certain functionalities and blocking rewarded ads when an adblocker is detected. However since this detection won't ever be 100% correct, we want to ensure that even users where we detect an AdBlocker can play the game according to these rules:

    Players with AdBlocker should be able to play the game normally: It is never allowed to block players with AdBlockers from playing, or penalize players with certain disadvantages
    You can block certain features or special functionalities in the game; make sure to show a notice on such functions that they are blocked because of the AdBlocker usage
        Do not use popups as they might interfere with fullscreen behaviour and with CrazyGames adblock notices
        Do not keep the rewarded ads clickable but without effect

CHECK HERE
https://docs.crazygames.com/requirements/account-integration/#in-game-account-full
https://docs.crazygames.com/requirements/multiplayer/
CHECK HERE AS FINAL
https://docs.crazygames.com/