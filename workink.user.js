// ==UserScript==
// @name         Work.ink Assistant
// @namespace    http://tampermonkey.net/
// @version      2.9
// @description  Bypasses adblock checks, automates Temp-Mail verification, blocks popups (with mock window returns to satisfy anti-cheat), and deeply spoofs tabbed-out states on Document.prototype.
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
        let isSpoofingStep = false; // Tracks persistent "Waiting for step..." spoofing

        // Stateful dispatcher to handle visibility toggle reliably
        function setSpoofedHiddenState(hidden) {
            if (isTabHidden === hidden) return;
            isTabHidden = hidden;

            console.log(`[Bypass] Spoofing tab visibility state to: ${hidden ? 'HIDDEN (Tabbed-Out)' : 'VISIBLE (Focused)'}`);
            const visEvent = new Event('visibilitychange', { bubbles: true });

            if (hidden) {
                win.dispatchEvent(new Event('blur', { bubbles: true }));
                win.document.dispatchEvent(visEvent);
            } else {
                win.dispatchEvent(new Event('focus', { bubbles: true }));
                win.document.dispatchEvent(visEvent);
            }
        }

        function triggerFakeTabSwitch() {
            if (isFocusSpoofingInProgress || isSpoofingStep) return;
            isFocusSpoofingInProgress = true;
            console.log("[Bypass] Simulating tab switch (leaving page)...");

            setSpoofedHiddenState(true);

            let elapsedSeconds = 0;
            const pulseInterval = setInterval(() => {
                elapsedSeconds += 3;
                console.log(`[Bypass] Pulsing return focus check... (Elapsed: ${elapsedSeconds}s)`);

                setSpoofedHiddenState(false);

                const browsingModal = win.document.querySelector('.modalwrapper.svelte-1qp6ola');
                if (!browsingModal) {
                    console.log("[Bypass] Focus spoof accepted! Modal closed naturally.");
                    clearInterval(pulseInterval);
                    isFocusSpoofingInProgress = false;
                } else {
                    setSpoofedHiddenState(true);
                }
            }, 3000);
        }

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
                    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: win, buttons: type.includes('down') ? 1 : 0 });
                    element.dispatchEvent(ev);
                });
            }, delay);
        }

        // --- 1.4: DOM Watcher for Monocle, Modals & Auto-Clicker ---
        const observer = new MutationObserver(() => {
            if (!storedMonocleValue) {
                captureMonocle();
            }

            // A. Re-inject Monocle
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

            // B & C. Hide Adblock / Premium Modals
            win.document.querySelectorAll('.backdrop-blur-2xl').forEach(modal => {
                if (modal.textContent && modal.textContent.includes('Browser Extension or VPN Detected')) {
                    modal.style.setProperty('display', 'none', 'important');
                    modal.style.setProperty('opacity', '0', 'important');
                }
            });
            win.document.querySelectorAll('.main-modal').forEach(modal => {
                if (modal.textContent && modal.textContent.includes('Get instant, ad-free access')) {
                    modal.style.setProperty('display', 'none', 'important');
                    modal.style.setProperty('opacity', '0', 'important');
                }
            });

            // D. Click "Continue with Email" inside Sign In modal
            const signInModal = win.document.querySelector('.main-modal.svelte-1cewne6');
            if (signInModal) {
                const emailBtn = Array.from(signInModal.querySelectorAll('button')).find(btn => btn.textContent.trim().toLowerCase() === 'continue with email');
                if (emailBtn) emailBtn.click();
            }

            // E. Handle Cookie modal Tab Spoofing
            win.document.querySelectorAll('.modalwrapper.svelte-1qp6ola').forEach(modal => {
                const title = modal.querySelector('.title.alt');
                if (title && title.textContent === 'Continue browsing...') {
                    title.textContent = 'Spoofing...';
                    triggerFakeTabSwitch();
                }
            });

            // F. Handle "Waiting for step completion..." Persistent Tab-Out Spoofing
            let stepModalPresent = false;
            win.document.querySelectorAll('.backdrop-blur-2xl').forEach(modal => {
                const span = modal.querySelector('span');
                if (span && (span.textContent.includes('Waiting for step completion...') || span.textContent.includes('Spoofing..'))) {
                    stepModalPresent = true;
                    if (span.textContent.includes('Waiting for step completion...')) {
                        span.textContent = 'Spoofing..';
                        console.log("[Bypass] Step completion overlay detected. Activating persistent tabbed-out spoof...");

                        isSpoofingStep = true;
                        // Delay by a fraction of a second to mimic natural human reaction time to tab away
                        setTimeout(() => setSpoofedHiddenState(true), 150);
                    }
                }
            });

            // When the site's internal timer finishes and naturally removes the modal
            if (!stepModalPresent && isSpoofingStep) {
                console.log("[Bypass] Step completion overlay removed naturally. Restoring focus...");
                isSpoofingStep = false;
                setSpoofedHiddenState(false);
            }

            // G. Handle hCaptcha positioning lock
            const hcaptchaContainer = win.document.getElementById('wk-hcaptcha-container');
            const proceedBtn = win.document.querySelector('.accessBtn');
            const loader = proceedBtn ? proceedBtn.querySelector('.loader-btn') : null;
            const isDone = loader && loader.classList.contains('loader-done');

            if (hcaptchaContainer) {
                const outerContainer = hcaptchaContainer.closest('.mx-auto.w-fit');
                if (outerContainer) {
                    if (!isDone && !outerContainer.classList.contains('locked-captcha-viewport')) {
                        outerContainer.classList.add('locked-captcha-viewport');
                    } else if (isDone && outerContainer.classList.contains('locked-captcha-viewport')) {
                        outerContainer.classList.remove('locked-captcha-viewport');
                    }
                }
            }

            // H. Auto-click Proceed
            if (proceedBtn && isDone) executeHumanClick(proceedBtn);
        });

        observer.observe(win.document.documentElement, { childList: true, subtree: true });

        // --- 1.5: Deep Visibility API Overrides (Prototype Level for Frameworks) ---
        if (win.Document && win.Document.prototype) {
            ['hidden', 'webkitHidden'].forEach(prop => {
                Object.defineProperty(win.Document.prototype, prop, {
                    get() { return isTabHidden; },
                    configurable: true
                });
            });
            ['visibilityState', 'webkitVisibilityState'].forEach(prop => {
                Object.defineProperty(win.Document.prototype, prop, {
                    get() { return isTabHidden ? 'hidden' : 'visible'; },
                    configurable: true
                });
            });
            Object.defineProperty(win.Document.prototype, 'hasFocus', {
                value: function() { return !isTabHidden; },
                configurable: true,
                writable: true
            });
        }

        // --- 1.6 - 1.10: Fetch/Ad/Script Interceptors ... ---
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.loaded = true;
        win.google_ad_modifications = win.google_ad_modifications || {};

        if (!win.Stripe) {
            win.Stripe = function(key, options) { return { elements: function() { return { create: function() { return { mount: function() {}, on: function() {}, off: function() {}, update: function() {}, destroy: function() {} }; } }; }, paymentRequest: function() { return { canMakePayment: function() { return Promise.resolve({ applePay: false, googlePay: false }); } }; } }; };
            win.Stripe.version = 3;
        }

        const originalFetch = win.fetch;
        const customFetch = function(input, init) {
            let url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
            if (url.includes('adsbygoogle.js') || url.includes('googlesyndication.com')) return Promise.resolve(new Response('window.adsbygoogle = window.adsbygoogle || []; window.adsbygoogle.loaded = true;', { status: 200, headers: { 'Content-Type': 'application/javascript' } }));
            if (url.includes('/country.json')) return Promise.resolve(new Response(JSON.stringify({ countryCode: 'US' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            if (url.includes('js.stripe.com/v3')) return Promise.resolve(new Response('', { status: 200 }));
            return originalFetch.apply(this, arguments);
        };
        win.fetch = customFetch;

        const originalCreateElement = win.document.createElement;
        const nativeScriptSrcDesc = Object.getOwnPropertyDescriptor(win.HTMLScriptElement.prototype, 'src');
        const nativeOnloadDesc = Object.getOwnPropertyDescriptor(win.HTMLElement.prototype, 'onload') || Object.getOwnPropertyDescriptor(win.Element.prototype, 'onload');

        const customCreateElement = function(tagName, options) {
            const element = originalCreateElement.apply(this, arguments);
            if (tagName.toLowerCase() === 'script') {
                let isAdSense = false, onloadFn = null, shouldTrigger = false;
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && (value.includes('adsbygoogle.js') || value.includes('googlesyndication.com'))) {
                        isAdSense = true; shouldTrigger = true;
                        if (onloadFn) setTimeout(onloadFn, 10);
                        return;
                    }
                    return originalSetAttribute.apply(this, arguments);
                };
                Object.defineProperty(element, 'src', {
                    get() { return isAdSense ? 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js' : nativeScriptSrcDesc.get.call(this); },
                    set(value) {
                        if (value && (value.includes('adsbygoogle.js') || value.includes('googlesyndication.com'))) {
                            isAdSense = true; shouldTrigger = true;
                            if (onloadFn) setTimeout(onloadFn, 10);
                        } else { nativeScriptSrcDesc.set.call(this, value); }
                    },
                    configurable: true
                });
                Object.defineProperty(element, 'onload', {
                    get() { return isAdSense ? onloadFn : nativeOnloadDesc.get.call(this); },
                    set(fn) {
                        if (isAdSense) { onloadFn = fn; if (shouldTrigger && fn) setTimeout(fn, 10); }
                        else { nativeOnloadDesc.set.call(this, fn); }
                    },
                    configurable: true
                });
            }
            return element;
        };
        win.document.createElement = customCreateElement;

        const originalContains = win.Node.prototype.contains;
        win.Node.prototype.contains = function(node) {
            if (node && node.classList && node.classList.contains('adsbygoogle')) return true;
            return originalContains.apply(this, arguments);
        };

        // --- 1.11: Multi-Layer Popup Blocker (Provides Fake Window) ---
        const originalOpen = win.open;
        const customOpen = function(url, target, features) {
            if (url) {
                try {
                    const parsedUrl = new URL(url, win.location.origin);
                    if (!parsedUrl.hostname.includes("work.ink") && !parsedUrl.hostname.includes("temp-mail.org")) {
                        console.log("[Bypass] Blocked window.open popup to:", url);
                        // IMPORTANT: Returning a fake window object prevents the site from realizing the popup blocker is active
                        return { closed: false, close: function(){ this.closed = true; }, focus: function(){}, postMessage: function(){} };
                    }
                } catch (e) {
                    if (typeof url === 'string' && !url.includes("work.ink") && !url.includes("temp-mail.org") && url.startsWith("http")) {
                        console.log("[Bypass] Blocked window.open popup (fallback) to:", url);
                        return { closed: false, close: function(){ this.closed = true; }, focus: function(){}, postMessage: function(){} };
                    }
                }
            }
            return originalOpen.apply(this, arguments);
        };
        win.open = customOpen;

        const originalAnchorClick = win.HTMLAnchorElement.prototype.click;
        win.HTMLAnchorElement.prototype.click = function() {
            const url = this.href;
            if (url) {
                try {
                    const parsedUrl = new URL(url, win.location.origin);
                    if (!parsedUrl.hostname.includes("work.ink") && !parsedUrl.hostname.includes("temp-mail.org") && parsedUrl.protocol.startsWith("http")) {
                        console.log("[Bypass] Blocked programmatic anchor click redirection to:", url);
                        return;
                    }
                } catch (e) {}
            }
            return originalAnchorClick.apply(this, arguments);
        };

        const originalDispatchEvent = win.EventTarget.prototype.dispatchEvent;
        win.EventTarget.prototype.dispatchEvent = function(event) {
            if (event && event.type === 'click' && this instanceof win.HTMLAnchorElement) {
                const url = this.href;
                if (url) {
                    try {
                        const parsedUrl = new URL(url, win.location.origin);
                        if (!parsedUrl.hostname.includes("work.ink") && !parsedUrl.hostname.includes("temp-mail.org") && parsedUrl.protocol.startsWith("http")) {
                            console.log("[Bypass] Blocked dispatched click event navigation to:", url);
                            event.preventDefault(); event.stopPropagation(); return false;
                        }
                    } catch (e) {}
                }
            }
            return originalDispatchEvent.apply(this, arguments);
        };

        const originalToString = win.Function.prototype.toString;
        win.Function.prototype.toString = function() {
            if (this === win.fetch || this === customFetch) return 'function fetch() { [native code] }';
            if (this === win.document.createElement || this === customCreateElement) return 'function createElement() { [native code] }';
            if (this === win.Node.prototype.contains) return 'function contains() { [native code] }';
            if (this === win.open || this === customOpen) return 'function open() { [native code] }';
            return originalToString.apply(this, arguments);
        };
    }

    // ==========================================
    // SECTION 2: EMAIL AUTOMATION
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
        const checkWorkInkField = setInterval(() => {
            const emailInput = document.querySelector("input#email");
            const codeInput = document.querySelector("input#code");
            const state = GM_getValue("state", "idle");

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
                    pollForEmail(emailInput);
                }
            } else if (codeInput) {
                clearInterval(checkWorkInkField);
                if (state !== "waiting_for_code" && state !== "code_completed") GM_setValue("state", "waiting_for_code");
                pollForCodeField();
            }
        }, 1000);

        function pollForEmail(inputElement) {
            const pollInterval = setInterval(() => {
                if (GM_getValue("state") === "completed") {
                    clearInterval(pollInterval);
                    fillEmail(inputElement);
                }
            }, 1000);
        }

        function fillEmail(inputElement) {
            const email = GM_getValue("temp_email", "");
            if (email) {
                setNativeValue(inputElement, email);
                GM_setValue("state", "waiting_for_code");
                setTimeout(() => {
                    const continueBtn = findButtonWithText("Continue");
                    if (continueBtn) continueBtn.click();
                    pollForCodeField();
                }, 500);
            } else {
                GM_setValue("state", "idle");
            }
        }

        function pollForCodeField() {
            const codeInterval = setInterval(() => {
                const codeInput = document.querySelector("input#code");
                const state = GM_getValue("state");

                if (codeInput && state === "code_completed") {
                    clearInterval(codeInterval);
                    const code = GM_getValue("temp_code", "");
                    if (code) {
                        setNativeValue(codeInput, code);
                        setTimeout(() => {
                            const verifyBtn = findButtonWithText("Verify & Continue");
                            if (verifyBtn) verifyBtn.click();
                        }, 500);
                    }
                    GM_setValue("state", "idle");
                    GM_setValue("temp_code", "");
                }
            }, 1000);
        }
    }

    if (isTempMail) {
        setInterval(() => {
            const state = GM_getValue("state", "");
            const currentUrl = win.location.href;

            if (state === "fetching") {
                const mailInput = document.querySelector("input#mail");
                if (mailInput) {
                    const emailValue = mailInput.value || mailInput.getAttribute('value');
                    if (emailValue && emailValue.includes("@") && !emailValue.toLowerCase().includes("loading")) {
                        GM_setValue("temp_email", emailValue);
                        GM_setValue("state", "completed");
                    }
                }
            } else if (state === "waiting_for_code") {
                if (currentUrl.includes("/view/")) {
                    const introEl = document.querySelector(".inbox-data-content-intro");
                    if (introEl) {
                        const match = (introEl.innerText || introEl.textContent).match(/Code:\s*(\d+)/i);
                        if (match) {
                            GM_setValue("temp_code", match[1]);
                            GM_setValue("state", "code_completed");
                            const deleteBtn = document.querySelector("button.deleteMail");
                            if (deleteBtn) deleteBtn.click();
                            setTimeout(() => win.close(), 500);
                        }
                    }
                } else {
                    const links = document.querySelectorAll("a.viewLink");
                    let foundLink = null;
                    for (const link of links) {
                        const senderName = link.querySelector(".inboxSenderName");
                        const senderEmail = link.querySelector(".inboxSenderEmail");
                        if ((senderName && senderName.textContent.includes("work.ink")) || (senderEmail && senderEmail.textContent.includes("noreply@work.ink"))) {
                            foundLink = link; break;
                        }
                    }
                    if (foundLink) {
                        const href = foundLink.getAttribute("href");
                        if (href && href !== "javascript:void(0);" && href.startsWith("http")) win.location.href = href;
                        else foundLink.click();
                    }
                }
            }
        }, 1000);
    }
})();
