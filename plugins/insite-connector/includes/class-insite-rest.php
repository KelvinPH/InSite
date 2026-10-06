<?php
/**
 * REST API registration.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_REST {
	const NAMESPACE = 'insite/v1';

	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/status',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_status' ),
				'permission_callback' => array( 'InSite_Auth', 'permission_check' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_health' ),
				'permission_callback' => array( 'InSite_Auth', 'permission_check' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/update',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'post_update' ),
				'permission_callback' => array( 'InSite_Auth', 'permission_check' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/errors',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_errors' ),
				'permission_callback' => array( 'InSite_Auth', 'permission_check' ),
			)
		);
	}

	/**
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_status( $request ) {
		return rest_ensure_response( InSite_Status::collect() );
	}

	/**
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_health( $request ) {
		return rest_ensure_response( InSite_Health::collect() );
	}

	/**
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function post_update( $request ) {
		$type = $request->get_param( 'type' );
		$slug = $request->get_param( 'slug' );

		if ( ! in_array( $type, array( 'core', 'plugin', 'theme' ), true ) ) {
			return new WP_Error( 'insite_bad_type', 'Invalid update type.', array( 'status' => 400 ) );
		}
		if ( 'core' !== $type && ( ! is_string( $slug ) || '' === $slug ) ) {
			return new WP_Error( 'insite_bad_slug', 'Missing slug.', array( 'status' => 400 ) );
		}
		if ( 'core' === $type ) {
			$slug = 'wordpress';
		}

		return rest_ensure_response( InSite_Update::run( $type, $slug ) );
	}

	/**
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_errors( $request ) {
		$lines = $request->get_param( 'lines' );
		$n     = $lines ? (int) $lines : 100;
		return rest_ensure_response( InSite_Errors::collect( $n ) );
	}
}
