<?php
/**
 * Site status payload (no Site Health suite).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_Status {
	/**
	 * @return array
	 */
	public static function collect() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		require_once ABSPATH . 'wp-admin/includes/update.php';
		wp_update_plugins();
		wp_update_themes();

		$plugin_updates = get_site_transient( 'update_plugins' );
		$theme_updates  = get_site_transient( 'update_themes' );
		$core_updates   = get_site_transient( 'update_core' );

		$plugins = array();
		foreach ( get_plugins() as $file => $data ) {
			$slug = dirname( $file );
			if ( '.' === $slug ) {
				$slug = basename( $file, '.php' );
			}
			$available = null;
			if ( isset( $plugin_updates->response[ $file ]->new_version ) ) {
				$available = $plugin_updates->response[ $file ]->new_version;
			}
			$plugins[] = array(
				'slug'             => $slug,
				'name'             => $data['Name'],
				'version'          => $data['Version'],
				'availableVersion' => $available,
				'active'           => is_plugin_active( $file ),
				'file'             => $file,
			);
		}

		$themes       = array();
		$active_theme = wp_get_theme();
		foreach ( wp_get_themes() as $stylesheet => $theme ) {
			$available = null;
			if ( isset( $theme_updates->response[ $stylesheet ]['new_version'] ) ) {
				$available = $theme_updates->response[ $stylesheet ]['new_version'];
			}
			$themes[] = array(
				'slug'             => $stylesheet,
				'name'             => $theme->get( 'Name' ),
				'version'          => $theme->get( 'Version' ),
				'availableVersion' => $available,
				'active'           => ( $stylesheet === $active_theme->get_stylesheet() ),
			);
		}

		$core_update = null;
		if ( is_object( $core_updates ) && ! empty( $core_updates->updates ) ) {
			foreach ( $core_updates->updates as $update ) {
				if ( isset( $update->response ) && 'upgrade' === $update->response && ! empty( $update->version ) ) {
					$core_update = $update->version;
					break;
				}
			}
		}

		$disk_free = null;
		if ( function_exists( 'disk_free_space' ) ) {
			$free = @disk_free_space( ABSPATH );
			if ( false !== $free ) {
				$disk_free = (int) $free;
			}
		}

		return array(
			'siteUrl'     => home_url( '/' ),
			'wpVersion'   => get_bloginfo( 'version' ),
			'phpVersion'  => PHP_VERSION,
			'activeTheme' => array(
				'slug'             => $active_theme->get_stylesheet(),
				'name'             => $active_theme->get( 'Name' ),
				'version'          => $active_theme->get( 'Version' ),
				'availableVersion' => isset( $theme_updates->response[ $active_theme->get_stylesheet() ]['new_version'] )
					? $theme_updates->response[ $active_theme->get_stylesheet() ]['new_version']
					: null,
				'active'           => true,
			),
			'plugins'     => $plugins,
			'themes'      => $themes,
			'coreUpdate'  => $core_update,
			'diskFreeBytes' => $disk_free,
			'memoryLimit' => ini_get( 'memory_limit' ) ? ini_get( 'memory_limit' ) : null,
		);
	}
}
