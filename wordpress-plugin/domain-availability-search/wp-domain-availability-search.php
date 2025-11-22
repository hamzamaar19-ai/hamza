<?php
/**
 * Plugin Name: Domain Availability Search & Suggestions
 * Description: Generates domain ideas, checks availability (mock/demo), and routes affiliate purchase links. Includes admin settings and shortcode [domain_availability_search].
 * Version: 1.0.0
 * Author: Example
 */

if (!defined('ABSPATH')) {
    exit;
}

class Domain_Availability_Search_Plugin {
    const OPTION_KEY = 'das_options';
    const VERSION = '1.0.0';

    public function __construct() {
        add_action('init', [$this, 'register_shortcode']);
        add_action('admin_menu', [$this, 'register_admin_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_enqueue_scripts', [$this, 'register_assets']);
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public static function activate() {
        $defaults = [
            'default_tlds' => ['.com', '.net', '.io', '.co'],
            'registrars' => [
                'Namecheap' => 'https://www.namecheap.com/domains/registration/results/?domain=%s',
                'GoDaddy' => 'https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck=%s',
                'Porkbun' => 'https://porkbun.com/checkout/search?q=%s',
                'Cloudflare' => 'https://dash.cloudflare.com/sign-up/domain-registration?domain=%s'
            ],
            'max_results' => 200
        ];
        if (!get_option(self::OPTION_KEY)) {
            add_option(self::OPTION_KEY, $defaults);
        }
    }

    public function register_assets() {
        $base = plugin_dir_url(__FILE__);
        wp_register_style('das-styles', $base . 'assets/css/styles.css', [], self::VERSION);
        wp_register_script('das-app', $base . 'assets/js/app.js', ['wp-element'], self::VERSION, true);
    }

    public function register_shortcode() {
        add_shortcode('domain_availability_search', [$this, 'render_shortcode']);
    }

    public function render_shortcode() {
        wp_enqueue_style('das-styles');
        wp_enqueue_script('das-app');

        $options = $this->get_options();
        wp_localize_script('das-app', 'DomainSearchSettings', [
            'restUrl' => esc_url_raw(rest_url('domain-search/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'tlds' => array_values($options['default_tlds']),
            'registrars' => $options['registrars'],
            'maxResults' => intval($options['max_results'])
        ]);

        ob_start();
        include plugin_dir_path(__FILE__) . 'templates/frontend.php';
        return ob_get_clean();
    }

    public function register_admin_page() {
        add_options_page(
            __('Domain Availability Search', 'das'),
            __('Domain Search', 'das'),
            'manage_options',
            'das-settings',
            [$this, 'render_admin_page']
        );
    }

    public function register_settings() {
        register_setting('das_settings', self::OPTION_KEY, [$this, 'sanitize_options']);
        add_settings_section('das_main', __('Configuration', 'das'), '__return_false', 'das-settings');

        add_settings_field('default_tlds', __('Default TLDs', 'das'), function () {
            $options = $this->get_options();
            echo '<input type="text" name="' . esc_attr(self::OPTION_KEY) . '[default_tlds]" value="' . esc_attr(implode(',', $options['default_tlds'])) . '" class="regular-text" />';
            echo '<p class="description">Comma-separated list (e.g., .com,.net,.io)</p>';
        }, 'das-settings', 'das_main');

        add_settings_field('max_results', __('Max results', 'das'), function () {
            $options = $this->get_options();
            echo '<input type="number" min="10" max="5000" name="' . esc_attr(self::OPTION_KEY) . '[max_results]" value="' . intval($options['max_results']) . '" />';
        }, 'das-settings', 'das_main');

        add_settings_field('registrars', __('Registrar affiliate templates', 'das'), function () {
            $options = $this->get_options();
            echo '<p class="description">Use %s where the domain will be injected.</p>';
            foreach ($options['registrars'] as $name => $link) {
                echo '<p><label>' . esc_html($name) . ': <input type="text" style="width:100%" name="' . esc_attr(self::OPTION_KEY) . '[registrars][' . esc_attr($name) . ']" value="' . esc_attr($link) . '" /></label></p>';
            }
            echo '<p><label>' . __('Add new registrar name', 'das') . ': <input type="text" name="' . esc_attr(self::OPTION_KEY) . '[new_registrar][name]" /></label></p>';
            echo '<p><label>' . __('New registrar link template', 'das') . ': <input type="text" style="width:100%" name="' . esc_attr(self::OPTION_KEY) . '[new_registrar][link]" placeholder="https://example.com/?domain=%s" /></label></p>';
        }, 'das-settings', 'das_main');
    }

    public function render_admin_page() {
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Domain Availability Search', 'das') . '</h1>';
        echo '<form method="post" action="options.php">';
        settings_fields('das_settings');
        do_settings_sections('das-settings');
        submit_button();
        echo '</form>';
        echo '</div>';
    }

    public function sanitize_options($input) {
        $existing = $this->get_options();
        $output = $existing;

        if (isset($input['default_tlds'])) {
            $tlds = array_filter(array_map('trim', explode(',', $input['default_tlds'])));
            $output['default_tlds'] = array_slice($tlds, 0, 20);
        }

        if (isset($input['max_results'])) {
            $output['max_results'] = max(10, min(5000, intval($input['max_results'])));
        }

        if (isset($input['registrars']) && is_array($input['registrars'])) {
            $clean = [];
            foreach ($input['registrars'] as $name => $link) {
                $name = sanitize_text_field($name);
                $link = esc_url_raw($link);
                if ($name && $link) {
                    $clean[$name] = $link;
                }
            }
            $output['registrars'] = $clean;
        }

        if (!empty($input['new_registrar']['name']) && !empty($input['new_registrar']['link'])) {
            $name = sanitize_text_field($input['new_registrar']['name']);
            $link = esc_url_raw($input['new_registrar']['link']);
            if ($name && $link) {
                $output['registrars'][$name] = $link;
            }
        }

        return $output;
    }

    public function get_options() {
        $defaults = [
            'default_tlds' => ['.com', '.net', '.io', '.co'],
            'registrars' => [],
            'max_results' => 200
        ];
        $options = get_option(self::OPTION_KEY, $defaults);
        return wp_parse_args($options, $defaults);
    }

    public function register_routes() {
        register_rest_route('domain-search/v1', '/generate', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_generate'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('domain-search/v1', '/check', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_check'],
            'permission_callback' => '__return_true'
        ]);
    }

    public function handle_generate($request) {
        $params = $this->normalize_params($request);
        $domains = $this->generate_domains($params);
        $results = array_slice(array_map(function ($domain) {
            return $this->enrich_domain($domain);
        }, $domains), 0, $params['maxResults']);

        $meta = [
            'generated' => count($domains),
            'returned' => count($results),
            'recommendations' => $this->recommendations($params)
        ];

        return rest_ensure_response(['results' => $results, 'meta' => $meta]);
    }

    public function handle_check($request) {
        $params = $request->get_json_params();
        $domains = isset($params['domains']) && is_array($params['domains']) ? $params['domains'] : [];
        $showAll = !empty($params['showAll']);
        $results = [];
        foreach ($domains as $domain) {
            $row = $this->enrich_domain(sanitize_text_field($domain));
            if ($showAll || $row['status'] === 'available') {
                $results[] = $row;
            }
        }
        return rest_ensure_response(['results' => $results]);
    }

    private function normalize_params($request) {
        $params = $request->get_json_params();
        $length = isset($params['length']) ? intval($params['length']) : 4;
        $includeNumbers = !empty($params['includeNumbers']);
        $lettersOnly = !empty($params['lettersOnly']);
        $allowHyphen = !empty($params['allowHyphen']);
        $random = !empty($params['random']);
        $maxResults = isset($params['maxResults']) ? intval($params['maxResults']) : $this->get_options()['max_results'];
        $maxResults = max(10, min($this->get_options()['max_results'], $maxResults));

        $tlds = isset($params['tlds']) && is_array($params['tlds']) ? array_map('sanitize_text_field', $params['tlds']) : $this->get_options()['default_tlds'];
        $tlds = array_slice($tlds, 0, 20);

        return compact('length', 'includeNumbers', 'lettersOnly', 'allowHyphen', 'random', 'maxResults', 'tlds');
    }

    private function generate_domains($params) {
        $letters = range('a', 'z');
        $numbers = range(0, 9);
        $chars = $params['lettersOnly'] ? $letters : array_merge($letters, $params['includeNumbers'] ? $numbers : []);
        $chars = array_map('strval', $chars);
        if ($params['allowHyphen']) {
            $chars[] = '-';
        }

        if ($params['random']) {
            return $this->random_domains($chars, $params['tlds'], $params['length'], $params['maxResults']);
        }

        $maxCombo = pow(count($chars), $params['length']);
        $maxCombo = min($maxCombo, 50000);
        $domains = [];
        for ($i = 0; $i < $maxCombo; $i++) {
            $combo = '';
            $n = $i;
            for ($j = 0; $j < $params['length']; $j++) {
                $combo .= $chars[$n % count($chars)];
                $n = intdiv($n, count($chars));
            }
            foreach ($params['tlds'] as $tld) {
                $domains[] = $combo . $tld;
            }
            if (count($domains) >= 50000) {
                break;
            }
        }
        return $domains;
    }

    private function random_domains($chars, $tlds, $length, $limit) {
        $domains = [];
        $seen = [];
        $limit = min($limit * count($tlds), 50000);
        while (count($domains) < $limit) {
            $name = '';
            for ($i = 0; $i < $length; $i++) {
                $name .= $chars[array_rand($chars)];
            }
            if (isset($seen[$name])) {
                continue;
            }
            $seen[$name] = true;
            foreach ($tlds as $tld) {
                $domains[] = $name . $tld;
            }
        }
        return $domains;
    }

    private function enrich_domain($domain) {
        $statuses = ['available', 'taken', 'premium', 'for-sale'];
        $status = $statuses[array_rand($statuses)];
        $price = $status === 'available' ? rand(10, 60) : rand(200, 2000);
        $rating = str_repeat('★', rand(3, 5)) . str_repeat('☆', 5 - rand(3, 5));
        $keywordScore = rand(60, 99) . '/100';
        $links = $this->registrar_links($domain);
        return compact('domain', 'status', 'price', 'rating', 'keywordScore') + ['registrarLinks' => $links];
    }

    private function registrar_links($domain) {
        $options = $this->get_options();
        $links = [];
        foreach ($options['registrars'] as $name => $template) {
            if (strpos($template, '%s') !== false) {
                $links[$name] = sprintf($template, urlencode($domain));
            }
        }
        return $links;
    }

    private function recommendations($params) {
        $words = ['flow', 'hub', 'stack', 'pilot', 'nova', 'spark'];
        $recs = [];
        foreach ($words as $word) {
            $recs[] = [
                'suggestion' => $word . substr($params['tlds'][0], 1),
                'reason' => 'Trending keyword pattern'
            ];
        }
        return $recs;
    }
}

register_activation_hook(__FILE__, ['Domain_Availability_Search_Plugin', 'activate']);
new Domain_Availability_Search_Plugin();
