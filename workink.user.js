// ==UserScript==
// @name         Work.ink Assistant
// @namespace    http://tampermonkey.net/
// @version      2.7
// @description  Bypasses adblock/VPN checks, automates Temp-Mail verification, strictly blocks external ad popups (including anchor click redirects), centers hCaptcha on-screen, and auto-clicks proceed buttons.
// @match        https://*.work.ink/*
// @match        https://temp-mail.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @grant        unsafeWindow
// @grant        window.close
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const isWorkInk = win.location.hostname.includes("work.ink");
    const isTempMail = win.location.hostname.includes("temp-mail.org");

    console.log("[Automation Script] Loaded on:", win.location.hostname);

    // Global click cooldown tracker
    let lastClickedTime = 0;

    // ==========================================
    // SECTION 1: STEALTH BYPASSES & SPOOFING (Work.ink Only)
    // ==========================================
    if (isWorkInk) {
        // --- 1.1: Fail-Safe CSS Overlay Hiders & hCaptcha Pinning Styles ---
        const style = win.document.createElement('style');
        style.textContent = `
            /* Hide toast notifications dynamically */
            .toastwrapper, .toast, [class*="toastwrapper"] {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
                opacity: 0 !important;
            }

            /* Target the Adblock/VPN warning using the shield-off icon class */
            div.backdrop-blur-2xl:has(.lucide-shield-off) {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
                opacity: 0 !important;
            }

            /* Hide the Premium / Ad-Free paywall modal */
            div.main-modal:has(.no-ads-badge),
            div.main-modal:has([class*="no-ads-badge"]),
            .main-modal.svelte-1o00xxn {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
                opacity: 0 !important;
            }

            /* Class to lock the hCaptcha container to the center of the viewport */
            .locked-captcha-viewport {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 10000 !important;
                background: rgba(26, 26, 26, 0.95) !important;
                padding: 20px 30px !important;
                border-radius: 20px !important;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                pointer-events: auto !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
        `;
        win.document.documentElement.appendChild(style);

        // --- 1.2: Capture and Re-inject Server-Rendered Monocle Token ---
        const FALLBACK_MONOCLE_TOKEN = "eyJhbGciOiJFQ0RILUVTIiwiZW5jIjoiQTI1NkdDTSIsImVwayI6eyJrdHkiOiJFQyIsImNydiI6IlAtNTIxIiwieCI6IkFIZzFVcjA0a3VvUzJKQnUwVHcwdkgwdHhCVzFIS1JrOWZBOU5wU1A3bWxTM2xNM1hsY0s1Vk1ZeGhpSE0tUXBIZkhxWlZaRFdHUm5XWDNraGJxR1ZoN00iLCJ5IjoiQUM3MkpYNEVySWVIcE5GMnBvd01uNnV4OW9ielNSZHFON0JJUEN6TlRIOU1mTmFOaHRZR1pYQ05LZ0NUeEQya3FPbDdPTmlSQTRSZHhSYTEzSE0yMEEzYiJ9fQ..Nn6SOAGZieAFMDNF.M4Bj75kBDCbjfdQhhwhk5JB-0MEH3mRvvAe61rdq3IGgYP8miKA4yKz-_yOZNpItk9uFeO6mr4jq6Qn7eMOYgnRUvedS5pdJJolZgQvky0fshZ1ExhfoD9gG-GisI9LbuDCIZVHCa-AZSZPFNvw71RQP0Uco5ctoQXxu7W63eB0wF9FpVNGf4fmG892yKDnk0lYhMVOff9gSfvMW-YSyzcgnBTirE8h1eiMWeIMPHkHo5BIaAEnHPSp7fqTrdStlQ8bJGvM9D17cpeP82AkK0bc-QON4lX_HwO67g41mmgJoHDT5jtCv-Xkso-AS2huKhA-Xzm07leiH489w9DdNISi1aTAHQ1qP4kngqifhXu2f7Gk42tNzhdwOSxnvon4LaJP-hw.BJVWqfKk9iEuDm9pGRdtOg";
        let storedMonocleValue = '';

        const captureMonocle = () => {
            const input = win.document.querySelector('form.monocle-enriched input[name="monocle"]');
            if (input && input.value && !storedMonocleValue) {
                storedMonocleValue = input.value;
            }
        };

        captureMonocle();
        win.document.addEventListener('readystatechange', () => {
            if (win.document.readyState === 'interactive' || win.document.readyState === 'complete') {
                captureMonocle();
            }
        });
        win.document.addEventListener('DOMContentLoaded', captureMonocle);

        // --- 1.3: Dynamic Focus & Visibility State-Transition Spoofing ---
        let isTabHidden = false;
        let isFocusSpoofingInProgress = false;

        function triggerFakeTabSwitch() {
            if (isFocusSpoofingInProgress) return;
            isFocusSpoofingInProgress = true;

            console.log("[Bypass] Simulating tab switch (leaving page)...");
            isTabHidden = true;

            win.dispatchEvent(new Event('blur'));
            win.document.dispatchEvent(new Event('visibilitychange'));

            let elapsedSeconds = 0;
            const pulseInterval = setInterval(() => {
                elapsedSeconds += 3;
                console.log(`[Bypass] Pulsing return focus check... (Elapsed: ${elapsedSeconds}s)`);

                isTabHidden = false;
                win.dispatchEvent(new Event('focus'));
                win.document.dispatchEvent(new Event('visibilitychange'));

                const browsingModal = win.document.querySelector('.modalwrapper.svelte-1qp6ola');
                if (!browsingModal) {
                    console.log("[Bypass] Focus spoof accepted! Modal closed naturally.");
                    clearInterval(pulseInterval);
                    isFocusSpoofingInProgress = false;
                } else {
                    isTabHidden = true;
                    win.dispatchEvent(new Event('blur'));
                    win.document.dispatchEvent(new Event('visibilitychange'));
                }
            }, 3000);
        }

        // Human-like auto-click executor
        function executeHumanClick(element) {
            const now = Date.now();
            if (now - lastClickedTime < 1500) return;
            lastClickedTime = now;

            const delay = Math.floor(Math.random() * 400) + 350;
            console.log(`[Bypass] Proceed button ready! Scheduling click in ${delay}ms...`);

            setTimeout(() => {
                if (!element.isConnected) return;
                console.log("[Bypass] Dispatching human-like click sequence.");

                const eventSequence = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
                eventSequence.forEach(type => {
                    const ev = new MouseEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        view: win,
                        buttons: type.includes('down') ? 1 : 0
                    });
                    element.dispatchEvent(ev);
                });
            }, delay);
        }

        // --- 1.4: DOM Watcher for Monocle, Modals & Auto-Clicker ---
        const observer = new MutationObserver(() => {
            if (!storedMonocleValue) {
                captureMonocle();
            }

            // A. Re-inject Monocle token if deleted during hydration
            const activeToken = storedMonocleValue || FALLBACK_MONOCLE_TOKEN;
            const form = win.document.querySelector('form.monocle-enriched');
            if (form) {
                let input = form.querySelector('input[name="monocle"]');
                if (!input) {
                    input = win.document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'monocle';
                    input.value = activeToken;
                    form.appendChild(input);
                }
            }

            // B. Hide the Adblock / VPN Detected Overlay
            const adblockModals = win.document.querySelectorAll('.backdrop-blur-2xl');
            adblockModals.forEach(modal => {
                if (modal.textContent && modal.textContent.includes('Browser Extension or VPN Detected')) {
                    modal.style.setProperty('display', 'none', 'important');
                    modal.style.setProperty('visibility', 'hidden', 'important');
                    modal.style.setProperty('pointer-events', 'none', 'important');
                    modal.style.setProperty('opacity', '0', 'important');
                }
            });

            // C. Hide the Premium paywall modal
            const premiumModals = win.document.querySelectorAll('.main-modal');
            premiumModals.forEach(modal => {
                if (modal.textContent && modal.textContent.includes('Get instant, ad-free access')) {
                    modal.style.setProperty('display', 'none', 'important');
                    modal.style.setProperty('visibility', 'hidden', 'important');
                    modal.style.setProperty('pointer-events', 'none', 'important');
                    modal.style.setProperty('opacity', '0', 'important');
                }
            });

            // D. Click "Continue with Email" inside the Sign In modal
            const signInModal = win.document.querySelector('.main-modal.svelte-1cewne6');
            if (signInModal) {
                const emailBtn = Array.from(signInModal.querySelectorAll('button')).find(btn =>
                    btn.textContent.trim().toLowerCase() === 'continue with email'
                );
                if (emailBtn) {
                    console.log("[Automation] Sign-In modal detected. Clicking 'Continue with Email'...");
                    emailBtn.click();
                }
            }

            // E. Hide the "Continue browsing..." cookie modal and run tab spoofing
            const cookieModals = win.document.querySelectorAll('.modalwrapper.svelte-1qp6ola');
            cookieModals.forEach(modal => {
                const title = modal.querySelector('.title.alt');
                if (title && title.textContent === 'Continue browsing...') {
                    title.textContent = 'Spoofing...';
                    triggerFakeTabSwitch();
                }
            });

            // F. Handle hCaptcha positioning lock
            const hcaptchaContainer = win.document.getElementById('wk-hcaptcha-container');
            const proceedBtn = win.document.querySelector('.accessBtn');
            const loader = proceedBtn ? proceedBtn.querySelector('.loader-btn') : null;
            const isDone = loader && loader.classList.contains('loader-done');

            if (hcaptchaContainer) {
                const outerContainer = hcaptchaContainer.closest('.mx-auto.w-fit');
                if (outerContainer) {
                    if (!isDone) {
                        if (!outerContainer.classList.contains('locked-captcha-viewport')) {
                            console.log("[Bypass] Pinned hCaptcha widget to the center of the viewport.");
                            outerContainer.classList.add('locked-captcha-viewport');
                        }
                    } else {
                        if (outerContainer.classList.contains('locked-captcha-viewport')) {
                            outerContainer.classList.remove('locked-captcha-viewport');
                            console.log("[Bypass] Unpinned hCaptcha container.");
                        }
                    }
                }
            }

            // G. Auto-click "Proceed To Destination" when the loader completes
            if (proceedBtn && isDone) {
                executeHumanClick(proceedBtn);
            }
        });

        observer.observe(win.document.documentElement, {
            childList: true,
            subtree: true
        });

        // --- 1.5: Dynamic Visibility API Overrides ---
        Object.defineProperty(win.document, 'visibilityState', {
            get() { return isTabHidden ? 'hidden' : 'visible'; },
            configurable: true
        });
        Object.defineProperty(win.document, 'hidden', {
            get() { return isTabHidden; },
            configurable: true
        });
        win.document.hasFocus = function() {
            return !isTabHidden;
        };

        // --- 1.6: Mock AdSense & Stripe Fallbacks ---
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.loaded = true;
        win.google_ad_modifications = win.google_ad_modifications || {};

        if (!win.Stripe) {
            win.Stripe = function(key, options) {
                return {
                    elements: function() {
                        return {
                            create: function() {
                                return {
                                    mount: function() {},
                                    on: function() {},
                                    off: function() {},
                                    update: function() {},
                                    destroy: function() {}
                                };
                            }
                        };
                    },
                    paymentRequest: function() {
                        return {
                            canMakePayment: function() { return Promise.resolve({ applePay: false, googlePay: false }); }
                        };
                    }
                };
            };
            win.Stripe.version = 3;
        }

        // --- 1.7: Intercept fetch Requests ---
        const originalFetch = win.fetch;
        const customFetch = function(input, init) {
            let url = '';
            if (typeof input === 'string') {
                url = input;
            } else if (input && input.url) {
                url = input.url;
            }

            if (url.includes('adsbygoogle.js') || url.includes('googlesyndication.com')) {
                return Promise.resolve(new Response('window.adsbygoogle = window.adsbygoogle || []; window.adsbygoogle.loaded = true;', {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/javascript' }
                }));
            }

            if (url.includes('/country.json')) {
                return Promise.resolve(new Response(JSON.stringify({ countryCode: 'US' }), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            if (url.includes('js.stripe.com/v3')) {
                return Promise.resolve(new Response('', {
                    status: 200,
                    statusText: 'OK'
                }));
            }

            return originalFetch.apply(this, arguments);
        };
        win.fetch = customFetch;

        // --- 1.8: Intercept Script Tag Creation & Trigger Onload ---
        const originalCreateElement = win.document.createElement;
        const nativeScriptSrcDesc = Object.getOwnPropertyDescriptor(win.HTMLScriptElement.prototype, 'src');
        const nativeOnloadDesc = Object.getOwnPropertyDescriptor(win.HTMLElement.prototype, 'onload') ||
                                 Object.getOwnPropertyDescriptor(win.Element.prototype, 'onload');

        const customCreateElement = function(tagName, options) {
            const element = originalCreateElement.apply(this, arguments);
            if (tagName.toLowerCase() === 'script') {
                let isAdSense = false;
                let srcVal = '';
                let onloadFn = null;
                let shouldTrigger = false;

                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && (value.includes('adsbygoogle.js') || value.includes('googlesyndication.com'))) {
                        isAdSense = true;
                        shouldTrigger = true;
                        if (onloadFn) {
                            setTimeout(onloadFn, 10);
                        }
                        return;
                    }
                    return originalSetAttribute.apply(this, arguments);
                };

                Object.defineProperty(element, 'src', {
                    get() {
                        if (isAdSense) return 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
                        return nativeScriptSrcDesc.get.call(this);
                    },
                    set(value) {
                        if (value && (value.includes('adsbygoogle.js') || value.includes('googlesyndication.com'))) {
                            isAdSense = true;
                            shouldTrigger = true;
                            if (onloadFn) {
                                setTimeout(onloadFn, 10);
                            }
                        } else {
                            nativeScriptSrcDesc.set.call(this, value);
                        }
                    },
                    configurable: true
                });

                Object.defineProperty(element, 'onload', {
                    get() {
                        if (isAdSense) return onloadFn;
                        return nativeOnloadDesc.get.call(this);
                    },
                    set(fn) {
                        if (isAdSense) {
                            onloadFn = fn;
                            if (shouldTrigger && fn) {
                                setTimeout(fn, 10);
                            }
                        } else {
                            nativeOnloadDesc.set.call(this, fn);
                        }
                    },
                    configurable: true
                });
            }
            return element;
        };
        win.document.createElement = customCreateElement;

        // --- 1.9: Spoof Bait DOM Elements ---
        const originalContains = win.Node.prototype.contains;
        const customContains = function(node) {
            if (node && node.classList && node.classList.contains('adsbygoogle')) {
                return true;
            }
            return originalContains.apply(this, arguments);
        };
        win.Node.prototype.contains = customContains;

        // --- 1.10: Spoof Child Count of Ad Elements ---
        const descriptor = Object.getOwnPropertyDescriptor(win.Element.prototype, 'childElementCount') ||
                           Object.getOwnPropertyDescriptor(win.Node.prototype, 'childElementCount');
        const originalGetter = descriptor ? descriptor.get : null;
        const originalGetterStr = originalGetter ? originalGetter.toString() : 'function get childElementCount() { [native code] }';

        const newGetter = function() {
            if (this.id === 'aswift_1_host') {
                return 1;
            }
            if (originalGetter) {
                return originalGetter.call(this);
            }
            return this.children ? this.children.length : 0;
        };

        Object.defineProperty(win.Element.prototype, 'childElementCount', {
            get: newGetter,
            configurable: true
        });

        // --- 1.11: Multi-Layer Popup Blocker (Firefox Verified) ---
        // Hook 1: Overrides win.open to block external popups
        const originalOpen = win.open;
        const customOpen = function(url, target, features) {
            if (url) {
                try {
                    const parsedUrl = new URL(url, win.location.origin);
                    if (!parsedUrl.hostname.includes("work.ink") && !parsedUrl.hostname.includes("temp-mail.org")) {
                        console.log("[Bypass] Blocked window.open popup to:", url);
                        return null;
                    }
                } catch (e) {
                    if (typeof url === 'string' && !url.includes("work.ink") && !url.includes("temp-mail.org") && url.startsWith("http")) {
                        console.log("[Bypass] Blocked window.open popup (fallback):", url);
                        return null;
                    }
                }
            }
            return originalOpen.apply(this, arguments);
        };
        win.open = customOpen;

        // Hook 2: Intercepts direct element.click() calls on anchor elements
        const originalAnchorClick = win.HTMLAnchorElement.prototype.click;
        const customAnchorClick = function() {
            const url = this.href;
            if (url) {
                try {
                    const parsedUrl = new URL(url, win.location.origin);
                    if (!parsedUrl.hostname.includes("work.ink") && !parsedUrl.hostname.includes("temp-mail.org") && parsedUrl.protocol.startsWith("http")) {
                        console.log("[Bypass] Blocked programmatic anchor click redirection to:", url);
                        return; // Prevent click propagation and navigation
                    }
                } catch (e) {}
            }
            return originalAnchorClick.apply(this, arguments);
        };
        win.HTMLAnchorElement.prototype.click = customAnchorClick;

        // Hook 3: Intercepts synthetic click events dispatched to anchors
        const originalDispatchEvent = win.EventTarget.prototype.dispatchEvent;
        const customDispatchEvent = function(event) {
            if (event && event.type === 'click' && this instanceof win.HTMLAnchorElement) {
                const url = this.href;
                if (url) {
                    try {
                        const parsedUrl = new URL(url, win.location.origin);
                        if (!parsedUrl.hostname.includes("work.ink") && !parsedUrl.hostname.includes("temp-mail.org") && parsedUrl.protocol.startsWith("http")) {
                            console.log("[Bypass] Blocked dispatched click event navigation to:", url);
                            event.preventDefault();
                            event.stopPropagation();
                            return false;
                        }
                    } catch (e) {}
                }
            }
            return originalDispatchEvent.apply(this, arguments);
        };
        win.EventTarget.prototype.dispatchEvent = customDispatchEvent;

        // --- 1.12: Global Prototype toString Patch (Stealth Injection) ---
        const originalToString = win.Function.prototype.toString;
        win.Function.prototype.toString = function() {
            if (this === win.fetch || this === customFetch) {
                return 'function fetch() { [native code] }';
            }
            if (this === win.document.createElement || this === customCreateElement) {
                return 'function createElement() { [native code] }';
            }
            if (this === win.Node.prototype.contains || this === customContains) {
                return 'function contains() { [native code] }';
            }
            if (this === win.Stripe) {
                return 'function Stripe() { [native code] }';
            }
            if (this === newGetter) {
                return originalGetterStr;
            }
            if (this === win.document.hasFocus) {
                return 'function hasFocus() { [native code] }';
            }
            if (this === win.open || this === customOpen) {
                return 'function open() { [native code] }';
            }
            if (this === win.HTMLAnchorElement.prototype.click || this === customAnchorClick) {
                return 'function click() { [native code] }';
            }
            if (this === win.EventTarget.prototype.dispatchEvent || this === customDispatchEvent) {
                return 'function dispatchEvent() { [native code] }';
            }
            return originalToString.apply(this, arguments);
        };
    }

    // ==========================================
    // SECTION 2: EMAIL AUTOMATION (Firefox Optimized)
    // ==========================================
    function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function findButtonWithText(text) {
        const buttons = Array.from(document.querySelectorAll("button, a[role='button'], div[role='button']"));
        let btn = buttons.find(b => b.textContent.trim().toLowerCase() === text.toLowerCase());
        if (btn) return btn;
        return buttons.find(b => b.textContent.toLowerCase().includes(text.toLowerCase()));
    }

    if (isWorkInk) {
        console.log("[Automation Script] Scanning page on work.ink...");

        const checkWorkInkField = setInterval(() => {
            const emailInput = document.querySelector("input#email");
            const codeInput = document.querySelector("input#code");
            const state = GM_getValue("state", "idle");

            // Context A: Email Input Screen
            if (emailInput && !codeInput) {
                if (state === "idle") {
                    clearInterval(checkWorkInkField);
                    console.log("[Automation Script] Initiating request. Opening temp-mail.org...");
                    GM_setValue("state", "fetching");
                    GM_openInTab("https://temp-mail.org/en/", { active: false, insert: true, setParent: true });
                    pollForEmail(emailInput);
                } else if (state === "completed") {
                    clearInterval(checkWorkInkField);
                    console.log("[Automation Script] Email address ready. Filling input...");
                    fillEmail(emailInput);
                } else if (state === "fetching") {
                    clearInterval(checkWorkInkField);
                    console.log("[Automation Script] Already fetching address. Resuming poll loop...");
                    pollForEmail(inputElement);
                }
            }
            // Context B: Code Verification Screen
            else if (codeInput) {
                clearInterval(checkWorkInkField);
                console.log("[Automation Script] Verification screen detected directly on work.ink.");

                if (state !== "waiting_for_code" && state !== "code_completed") {
                    GM_setValue("state", "waiting_for_code");
                }
                pollForCodeField();
            }
        }, 1000);

        function pollForEmail(inputElement) {
            let checkCount = 0;
            const pollInterval = setInterval(() => {
                checkCount++;
                const state = GM_getValue("state");

                if (checkCount % 5 === 0) {
                    console.log(`[Automation Script] Polling background tab... (Check #${checkCount}, State: ${state})`);
                }

                if (state === "completed") {
                    clearInterval(pollInterval);
                    console.log("[Automation Script] State changed to 'completed'. Filling email.");
                    fillEmail(inputElement);
                }
            }, 1000);
        }

        function fillEmail(inputElement) {
            const email = GM_getValue("temp_email", "");
            if (email) {
                console.log("[Automation Script] Inserting email value:", email);
                setNativeValue(inputElement, email);
                GM_setValue("state", "waiting_for_code");

                setTimeout(() => {
                    const continueBtn = findButtonWithText("Continue");
                    if (continueBtn) {
                        console.log("[Automation Script] Clicking 'Continue' button.");
                        continueBtn.click();
                    } else {
                        console.warn("[Automation Script] 'Continue' button not found.");
                    }
                    pollForCodeField();
                }, 500);
            } else {
                console.warn("[Automation Script] Expected email in storage, but found none.");
                GM_setValue("state", "idle");
            }
        }

        function pollForCodeField() {
            console.log("[Automation Script] Monitoring for verification code delivery...");
            let checkCount = 0;
            const codeInterval = setInterval(() => {
                checkCount++;
                const codeInput = document.querySelector("input#code");
                const state = GM_getValue("state");

                if (checkCount % 5 === 0) {
                    console.log(`[Automation Script] Code field check #${checkCount}. State: ${state}, Element Rendered: ${!!codeInput}`);
                }

                if (codeInput && state === "code_completed") {
                    clearInterval(codeInterval);
                    const code = GM_getValue("temp_code", "");

                    if (code) {
                        console.log("[Automation Script] Code retrieved! Autofilling:", code);
                        setNativeValue(codeInput, code);

                        setTimeout(() => {
                            const verifyBtn = findButtonWithText("Verify & Continue");
                            if (verifyBtn) {
                                console.log("[Automation Script] Clicking 'Verify & Continue' button.");
                                verifyBtn.click();
                            } else {
                                console.warn("[Automation Script] 'Verify & Continue' button not found.");
                            }
                        }, 500);
                    } else {
                        console.warn("[Automation Script] State completed, but no verification code was found.");
                    }

                    GM_setValue("state", "idle");
                    GM_setValue("temp_code", "");
                    console.log("[Automation Script] Process fully completed. State reset to 'idle'.");
                }
            }, 1000);
        }
    }

    if (isTempMail) {
        let checkCount = 0;

        setInterval(() => {
            checkCount++;
            const state = GM_getValue("state", "");
            const currentUrl = win.location.href;

            // Scenario A: First load - generating initial temporary email address
            if (state === "fetching") {
                const mailInput = document.querySelector("input#mail");
                if (mailInput) {
                    const emailValue = mailInput.value || mailInput.getAttribute('value');

                    if (checkCount % 5 === 0) {
                        console.log(`[Automation Script] Checking initial email... Current value: "${emailValue}"`);
                    }

                    if (emailValue && emailValue.includes("@") && !emailValue.toLowerCase().includes("loading")) {
                        console.log("[Automation Script] Valid email generated:", emailValue);
                        GM_setValue("temp_email", emailValue);
                        GM_setValue("state", "completed");
                    }
                }
            }
            // Scenario B: Waiting for work.ink to send the verification code email
            else if (state === "waiting_for_code") {

                // If we are on the view page: Extract the verification code, delete email, and close the tab
                if (currentUrl.includes("/view/")) {
                    const introEl = document.querySelector(".inbox-data-content-intro");

                    if (introEl) {
                        const text = introEl.innerText || introEl.textContent;
                        const match = text.match(/Code:\s*(\d+)/i);

                        if (match) {
                            const extractedCode = match[1];
                            console.log("[Automation Script] Extracted code:", extractedCode);

                            GM_setValue("temp_code", extractedCode);
                            GM_setValue("state", "code_completed");

                            const deleteBtn = document.querySelector("button.deleteMail");
                            if (deleteBtn) {
                                console.log("[Automation Script] Clicking 'Delete' button to clean up inbox.");
                                deleteBtn.click();

                                setTimeout(() => {
                                    console.log("[Automation Script] Closing temp-mail tab.");
                                    win.close();
                                }, 500);
                            } else {
                                console.warn("[Automation Script] 'Delete' button not found.");
                                setTimeout(() => {
                                    console.log("[Automation Script] Closing temp-mail tab (Fallback).");
                                    win.close();
                                }, 500);
                            }
                        } else {
                            if (checkCount % 5 === 0) {
                                console.log("[Automation Script] Inside view page, waiting to parse code format...");
                            }
                        }
                    } else {
                        if (checkCount % 5 === 0) {
                            console.log("[Automation Script] Inside view page, waiting for container '.inbox-data-content-intro' to render.");
                        }
                    }
                }
                // If we are on the main inbox page: Look for the incoming mail list item
                else {
                    const links = document.querySelectorAll("a.viewLink");
                    let foundLink = null;

                    for (const link of links) {
                        const senderName = link.querySelector(".inboxSenderName");
                        const senderEmail = link.querySelector(".inboxSenderEmail");

                        if ((senderName && senderName.textContent.includes("work.ink")) ||
                            (senderEmail && senderEmail.textContent.includes("noreply@work.ink"))) {
                            foundLink = link;
                            break;
                        }
                    }

                    if (foundLink) {
                        console.log("[Automation Script] Work.ink verification email detected! Viewing email...");
                        const href = foundLink.getAttribute("href");

                        if (href && href !== "javascript:void(0);" && href.startsWith("http")) {
                            console.log("[Automation Script] Navigating to URL:", href);
                            win.location.href = href;
                        } else {
                            console.log("[Automation Script] Triggering element click event.");
                            foundLink.click();
                        }
                    } else {
                        if (checkCount % 5 === 0) {
                            console.log("[Automation Script] Inbox scan: Waiting for verification email...");
                        }
                    }
                }
            }
        }, 1000);
    }
})();
