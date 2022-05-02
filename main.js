const GA_ID = document.documentElement.getAttribute("ga-id");
window.ga =
    window.ga ||
    function () {
        if (!GA_ID) {
            return;
        }
        (ga.q = ga.q || []).push(arguments);
    };
ga.l = + new Date();

ga("create", GA_ID,
    {
        'storage': 'none',
        'storeGac': false,
        'anonymizeIp': true,
        'allowAdFeatures': false,
    });
ga("set", "transport", "beacon");
var timeout = setTimeout(
    (onload = function () {
        clearTimeout(timeout);
        ga("send", "pageview");
    }),
    1000
);

let r = 255;
let g = 0;
let b = 0;

m = location.hash.match(/^#([0-9a-f]{6})$/i);
if (m) {
    r = eps + (1 - 2 * eps) * parseInt(m[1].substr(0, 2), 16);
    g = eps + (1 - 2 * eps) * parseInt(m[1].substr(2, 2), 16);
    b = eps + (1 - 2 * eps) * parseInt(m[1].substr(4, 2), 16);
}

let worker_okhsl = new Worker('workerokhsl.js');
worker_okhsl.onmessage = function (e) {
    display_results_okhsl(e.data);
};

function update_canvas(id, image) {
    let canvas = document.getElementById(id);
    let ctx = canvas.getContext('2d');
    ctx.putImageData(image, 0, 0);
}

function display_results_okhsl(results) {
    update_canvas('oklab_saturation_canvas', results["oklab_saturation"]);
    update_canvas('oklab_lightness_canvas', results["oklab_lightness"]);

    update_canvas('okhsl_hs_canvas', results["okhsl_hs"]);
    update_canvas('okhsl_hl_canvas', results["okhsl_hl"]);
    update_canvas('okhsl_sl_canvas', results["okhsl_sl"]);
}

function update(async = true) {
    {
        let hsl = srgb_to_okhsl(r, g, b);
        let hsl_a = 0.5 + 0.5 * hsl[1] * Math.cos(hsl[0] * 2 * Math.PI);
        let hsl_b = 0.5 + 0.5 * hsl[1] * Math.sin(hsl[0] * 2 * Math.PI);
        document.getElementById('okhsl_hs_manipulator').transform.baseVal.getItem(0).setTranslate(picker_size * hsl_a, picker_size * (1 - hsl_b));
        document.getElementById('okhsl_hl_manipulator').transform.baseVal.getItem(0).setTranslate(picker_size * hsl[0], picker_size * (1 - hsl[2]));
        document.getElementById('okhsl_sl_manipulator').transform.baseVal.getItem(0).setTranslate(picker_size * hsl[1], picker_size * (1 - hsl[2]));

        document.getElementById('oklab_hue_manipulator').transform.baseVal.getItem(0).setTranslate(big_slider_size * hsl[0], 0);
        document.getElementById('oklab_saturation_manipulator').transform.baseVal.getItem(0).setTranslate(big_slider_size * hsl[1], 0);
        document.getElementById('oklab_lightness_manipulator').transform.baseVal.getItem(0).setTranslate(big_slider_size * hsl[2], 0);

        document.getElementById('okhsl_h_input').value = Math.round(360 * hsl[0]);
        document.getElementById('okhsl_s_input').value = Math.round(100 * hsl[1]);
        document.getElementById('okhsl_l_input').value = Math.round(100 * hsl[2]);
    }

    if (async) {
        worker_okhsl.postMessage([r, g, b]);
    }
    else {
        display_results_okhsl(render_okhsl(r, g, b));
    }

    document.getElementById('swatch').style.backgroundColor = "rgb(" + r + "," + g + "," + b + ")";
    document.getElementById('hex_input').value = rgb_to_hex(r, g, b);
    document.getElementById('rgb_r_input').value = Math.round(r);
    document.getElementById('rgb_g_input').value = Math.round(g);
    document.getElementById('rgb_b_input').value = Math.round(b);
    const rf = (Math.round(r) / 255);
    const gf = (Math.round(g) / 255);
    const bf = (Math.round(b) / 255);
    document.getElementById('rgbf_r_input').value = rf.toFixed(2);
    document.getElementById('rgbf_g_input').value = gf.toFixed(2);
    document.getElementById('rgbf_b_input').value = bf.toFixed(2);
    document.getElementById('rgb_output').textContent = `0x${Math.round(r).toString(16)} 0x${Math.round(g).toString(16)
        } 0x${Math.round(b).toString(16)}`;
    document.getElementById('rgbf_output').textContent = `${(r / 255).toFixed(9)}, ${(g / 255).toFixed(9)}, ${(b / 255).toFixed(9)} `;
}

function initialize() {
    let mouse_handler = null;
    let touch_handler = null;

    function update_url() {
        history.replaceState(null, null, rgb_to_hex(r, g, b));
    }

    function setup_input_handler(input, handler) {
        input.addEventListener('change', (event) => {
            let newValue = Number(event.target.value);
            if (Number.isNaN(newValue))
                return;
            handler(newValue);
            update();
            update_url();
        }, false);
    }

    function setup_handler(canvas, handler) {
        let outer_mouse_handler = function (event) {
            event.preventDefault();

            let rect = canvas.getBoundingClientRect();
            let x = event.clientX - rect.left;
            let y = event.clientY - rect.top;

            handler(x, y);

            update();
        };

        let outer_touch_handler = function (event) {
            event.preventDefault();

            touch = event.touches[0];

            let rect = canvas.getBoundingClientRect();
            let x = touch.clientX - rect.left;
            let y = touch.clientY - rect.top;

            handler(x, y);

            update();
        };

        canvas.addEventListener('mousedown', function (event) {
            mouse_handler = outer_mouse_handler;
            outer_mouse_handler(event);

        }, false);

        canvas.addEventListener('touchstart', function (event) {
            if (event.touches.length === 1) {
                touch_handler = outer_touch_handler;
                outer_touch_handler(event);
            }
            else {
                touch_handler = null;
            }

        }, false);
    }

    function clamp(x) {
        return x < eps ? eps : (x > 1 - eps ? 1 - eps : x);
    }

    document.addEventListener('mouseup', function (event) {
        if (mouse_handler !== null) {
            mouse_handler(event);
            mouse_handler = null;
            update_url();
        }

    }, false);
    document.addEventListener('mousemove', function (event) {
        if (mouse_handler !== null) {
            mouse_handler(event);
        }
    }, false);

    document.addEventListener('touchend', function (event) {
        if (touch_handler !== null && event.touches.length === 0) {
            touch_handler = null;
            update_url();
        }

    }, false);
    document.addEventListener('touchmove', function (event) {
        if (touch_handler !== null && event.touches.length === 1) {
            touch_handler(event);
        }
    }, false);


    {
        setup_handler(document.getElementById('okhsl_hs_canvas'), function (x, y) {
            let hsl = srgb_to_okhsl(r, g, b);

            let hsl_a = 2 * (y / picker_size) - 1;
            let hsl_b = 2 * (1 - x / picker_size) - 1;

            let new_h = 0.5 + 0.5 * Math.atan2(hsl_a, hsl_b) / Math.PI;
            let new_s = clamp(Math.sqrt(hsl_a ** 2 + hsl_b ** 2));

            rgb = okhsl_to_srgb(new_h, new_s, hsl[2]);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });

        setup_handler(document.getElementById('okhsl_hl_canvas'), function (x, y) {
            let hsl = srgb_to_okhsl(r, g, b);

            let new_h = clamp(x / picker_size);
            let new_l = clamp(1 - y / picker_size);

            rgb = okhsl_to_srgb(new_h, hsl[1], new_l);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });

        setup_handler(document.getElementById('okhsl_sl_canvas'), function (x, y) {
            let hsl = srgb_to_okhsl(r, g, b);

            let new_s = clamp(x / picker_size);
            let new_v = clamp(1 - y / picker_size);

            rgb = okhsl_to_srgb(hsl[0], new_s, new_v);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });

        setup_handler(document.getElementById('oklab_hue_canvas'), function (x, y) {
            let h = clamp(x / big_slider_size);

            let hsl = srgb_to_okhsl(r, g, b);
            rgb = okhsl_to_srgb(h, hsl[1], hsl[2]);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });

        setup_handler(document.getElementById('oklab_saturation_canvas'), function (x, y) {
            let s = clamp(x / big_slider_size);

            let hsl = srgb_to_okhsl(r, g, b);
            rgb = okhsl_to_srgb(hsl[0], s, hsl[2]);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });

        setup_handler(document.getElementById('oklab_lightness_canvas'), function (x, y) {
            let l = clamp(x / big_slider_size);

            let hsl = srgb_to_okhsl(r, g, b);
            rgb = okhsl_to_srgb(hsl[0], hsl[1], l);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });

        setup_input_handler(document.getElementById('okhsl_h_input'), function (h) {
            h = clamp(h / 360);
            let hsl = srgb_to_okhsl(r, g, b);
            rgb = okhsl_to_srgb(h, hsl[1], hsl[2]);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });
        setup_input_handler(document.getElementById('okhsl_s_input'), function (s) {
            s = clamp(s / 100);
            let hsl = srgb_to_okhsl(r, g, b);
            rgb = okhsl_to_srgb(hsl[0], s, hsl[2]);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });
        setup_input_handler(document.getElementById('okhsl_l_input'), function (l) {
            l = clamp(l / 100);
            let hsl = srgb_to_okhsl(r, g, b);
            rgb = okhsl_to_srgb(hsl[0], hsl[1], l);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        });
    }



    document.getElementById('hex_input').addEventListener('change', (event) => {
        let rgb = hex_to_rgb(event.target.value);
        if (rgb == null)
            return;

        r = rgb[0];
        g = rgb[1];
        b = rgb[2];

        update();
        update_url();
    }, false);

    document.getElementById('rgb_r_input').addEventListener('change', (event) => {
        r = event.target.value;
        update();
        update_url();
    }, false);
    document.getElementById('rgb_g_input').addEventListener('change', (event) => {
        g = event.target.value;
        update();
        update_url();
    }, false);
    document.getElementById('rgb_b_input').addEventListener('change', (event) => {
        b = event.target.value;
        update();
        update_url();
    }, false);

    document.getElementById('rgbf_r_input').addEventListener('change', (event) => {
        r = event.target.value * 255;
        update();
        update_url();
    }, false);
    document.getElementById('rgbf_g_input').addEventListener('change', (event) => {
        g = event.target.value * 255;
        update();
        update_url();
    }, false);
    document.getElementById('rgbf_b_input').addEventListener('change', (event) => {
        b = event.target.value * 255;
        update();
        update_url();
    }, false);

    let results = render_static();

    update_canvas('oklab_hue_canvas', results["oklab_hue"]);


    update(false);
}