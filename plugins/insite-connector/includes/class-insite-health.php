<?php
/**
 * On-demand Site Health tests.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_Health {
	/**
	 * @return array{issues: array}
	 */
	public static function collect() {
		if ( ! class_exists( 'WP_Site_Health' ) ) {
			require_once ABSPATH . 'wp-admin/includes/class-wp-site-health.php';
		}

		$health = WP_Site_Health::get_instance();
		$tests  = $health->get_tests();
		$issues = array();

		$direct = isset( $tests['direct'] ) && is_array( $tests['direct'] ) ? $tests['direct'] : array();

		foreach ( $direct as $test_name => $test ) {
			if ( empty( $test['test'] ) ) {
				continue;
			}

			$result = null;
			if ( is_string( $test['test'] ) && method_exists( $health, 'get_test_' . $test['test'] ) ) {
				$result = call_user_func( array( $health, 'get_test_' . $test['test'] ) );
			} elseif ( is_callable( $test['test'] ) ) {
				$result = call_user_func( $test['test'] );
			}

			if ( ! is_array( $result ) || empty( $result['status'] ) ) {
				continue;
			}

			$status = $result['status'];
			if ( 'good' === $status ) {
				continue;
			}

			$issues[] = array(
				'test'        => (string) $test_name,
				'label'       => isset( $result['label'] ) ? wp_strip_all_tags( $result['label'] ) : (string) $test_name,
				'status'      => ( 'critical' === $status ) ? 'critical' : 'recommended',
				'description' => isset( $result['description'] ) ? wp_strip_all_tags( $result['description'] ) : '',
			);
		}

		return array( 'issues' => $issues );
	}
}
