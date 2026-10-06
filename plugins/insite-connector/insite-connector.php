<?php
/**
 * Plugin Name:       InSite Connector
 * Description:       Secure connector for the InSite multi-site WordPress dashboard.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            InSite
 * License:           GPL-2.0-or-later
 * Text Domain:       insite-connector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'INSITE_CONNECTOR_VERSION', '1.0.0' );
define( 'INSITE_CONNECTOR_FILE', __FILE__ );
define( 'INSITE_CONNECTOR_DIR', plugin_dir_path( __FILE__ ) );
define( 'INSITE_OPTION_SECRET', 'insite_connector_secret' );
define( 'INSITE_TRANSIENT_NONCE_PREFIX', 'insite_nonce_' );

require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-hmac.php';
require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-auth.php';
require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-status.php';
require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-health.php';
require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-update.php';
require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-errors.php';
require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-rest.php';
require_once INSITE_CONNECTOR_DIR . 'includes/class-insite-admin.php';

register_activation_hook( __FILE__, 'insite_connector_activate' );

/**
 * Generate a pairing secret on activation.
 */
function insite_connector_activate() {
	if ( ! get_option( INSITE_OPTION_SECRET ) ) {
		$secret = wp_generate_password( 48, true, true );
		add_option( INSITE_OPTION_SECRET, $secret, '', false );
	}
}

add_action(
	'rest_api_init',
	static function () {
		$rest = new InSite_REST();
		$rest->register_routes();
	}
);

if ( is_admin() ) {
	$admin = new InSite_Admin();
	$admin->hooks();
}
