<?php
/**
 * Core / plugin / theme updates via WP upgraders.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_Update {
	/**
	 * @param string $type core|plugin|theme
	 * @param string $slug
	 * @return array
	 */
	public static function run( $type, $slug ) {
		if ( ! function_exists( 'request_filesystem_credentials' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/misc.php';
			require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
			require_once ABSPATH . 'wp-admin/includes/theme.php';
			require_once ABSPATH . 'wp-admin/includes/update.php';
		}

		WP_Filesystem();

		switch ( $type ) {
			case 'plugin':
				return self::update_plugin( $slug );
			case 'theme':
				return self::update_theme( $slug );
			case 'core':
				return self::update_core();
			default:
				return array(
					'type'          => $type,
					'slug'          => $slug,
					'beforeVersion' => null,
					'afterVersion'  => null,
					'success'       => false,
					'error'         => 'Unknown update type.',
				);
		}
	}

	/**
	 * @param string $slug
	 * @return array
	 */
	private static function update_plugin( $slug ) {
		$plugins = get_plugins();
		$file    = null;
		$before  = null;
		foreach ( $plugins as $plugin_file => $data ) {
			$dir = dirname( $plugin_file );
			$base = ( '.' === $dir ) ? basename( $plugin_file, '.php' ) : $dir;
			if ( $base === $slug || $plugin_file === $slug ) {
				$file   = $plugin_file;
				$before = $data['Version'];
				break;
			}
		}

		if ( ! $file ) {
			return self::fail( 'plugin', $slug, null, 'Plugin not found.' );
		}

		wp_update_plugins();
		$skin     = new Automatic_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$result   = $upgrader->upgrade( $file );

		wp_clean_plugins_cache( true );
		$after = null;
		$plugins_after = get_plugins();
		if ( isset( $plugins_after[ $file ]['Version'] ) ) {
			$after = $plugins_after[ $file ]['Version'];
		}

		$success = false !== $result && ! is_wp_error( $result );
		if ( is_wp_error( $result ) ) {
			return self::fail( 'plugin', $slug, $before, $result->get_error_message() );
		}
		if ( false === $result ) {
			$messages = $skin->get_upgrade_messages();
			$msg = $messages ? implode( ' ', $messages ) : 'Plugin update failed.';
			return self::fail( 'plugin', $slug, $before, $msg );
		}

		return array(
			'type'          => 'plugin',
			'slug'          => $slug,
			'beforeVersion' => $before,
			'afterVersion'  => $after,
			'success'       => $success,
			'error'         => null,
		);
	}

	/**
	 * @param string $slug
	 * @return array
	 */
	private static function update_theme( $slug ) {
		$theme = wp_get_theme( $slug );
		if ( ! $theme->exists() ) {
			return self::fail( 'theme', $slug, null, 'Theme not found.' );
		}
		$before = $theme->get( 'Version' );

		wp_update_themes();
		$skin     = new Automatic_Upgrader_Skin();
		$upgrader = new Theme_Upgrader( $skin );
		$result   = $upgrader->upgrade( $slug );

		$theme_after = wp_get_theme( $slug );
		$after       = $theme_after->exists() ? $theme_after->get( 'Version' ) : null;

		if ( is_wp_error( $result ) ) {
			return self::fail( 'theme', $slug, $before, $result->get_error_message() );
		}
		if ( false === $result ) {
			return self::fail( 'theme', $slug, $before, 'Theme update failed.' );
		}

		return array(
			'type'          => 'theme',
			'slug'          => $slug,
			'beforeVersion' => $before,
			'afterVersion'  => $after,
			'success'       => true,
			'error'         => null,
		);
	}

	/**
	 * @return array
	 */
	private static function update_core() {
		$before = get_bloginfo( 'version' );
		wp_version_check();

		include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
		$skin     = new Automatic_Upgrader_Skin();
		$upgrader = new Core_Upgrader( $skin );
		$updates  = get_core_updates();
		if ( empty( $updates ) || ! is_array( $updates ) || empty( $updates[0] ) || 'latest' === $updates[0]->response ) {
			return array(
				'type'          => 'core',
				'slug'          => 'wordpress',
				'beforeVersion' => $before,
				'afterVersion'  => $before,
				'success'       => true,
				'error'         => null,
			);
		}

		$result = $upgrader->upgrade( $updates[0] );
		$after  = get_bloginfo( 'version' );

		if ( is_wp_error( $result ) ) {
			return self::fail( 'core', 'wordpress', $before, $result->get_error_message() );
		}
		if ( false === $result ) {
			return self::fail( 'core', 'wordpress', $before, 'Core update failed.' );
		}

		return array(
			'type'          => 'core',
			'slug'          => 'wordpress',
			'beforeVersion' => $before,
			'afterVersion'  => $after,
			'success'       => true,
			'error'         => null,
		);
	}

	/**
	 * @param string      $type
	 * @param string      $slug
	 * @param string|null $before
	 * @param string      $error
	 * @return array
	 */
	private static function fail( $type, $slug, $before, $error ) {
		return array(
			'type'          => $type,
			'slug'          => $slug,
			'beforeVersion' => $before,
			'afterVersion'  => null,
			'success'       => false,
			'error'         => $error,
		);
	}
}
