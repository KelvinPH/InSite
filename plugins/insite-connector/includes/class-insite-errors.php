<?php
/**
 * Read last N lines of debug.log without exposing paths.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_Errors {
	/**
	 * @param int $lines
	 * @return array{lines: string[], available: bool}
	 */
	public static function collect( $lines = 100 ) {
		$lines = max( 1, min( 500, (int) $lines ) );

		if ( ! defined( 'WP_DEBUG_LOG' ) || ! WP_DEBUG_LOG ) {
			return array(
				'lines'     => array(),
				'available' => false,
			);
		}

		$log_file = WP_CONTENT_DIR . '/debug.log';
		if ( true !== WP_DEBUG_LOG && is_string( WP_DEBUG_LOG ) ) {
			$candidate = WP_DEBUG_LOG;
			// Only allow reading under WP_CONTENT_DIR or ABSPATH uploads-equivalent absolute path that is the configured debug log.
			if ( is_string( $candidate ) && file_exists( $candidate ) ) {
				$log_file = $candidate;
			}
		}

		if ( ! is_readable( $log_file ) ) {
			return array(
				'lines'     => array(),
				'available' => false,
			);
		}

		$content = self::tail_file( $log_file, $lines );
		$raw_lines = preg_split( "/\r\n|\n|\r/", $content );
		$raw_lines = array_values( array_filter( $raw_lines, static function ( $line ) {
			return '' !== $line;
		} ) );

		// Redact absolute filesystem paths.
		$redacted = array();
		foreach ( $raw_lines as $line ) {
			$redacted[] = preg_replace( '#(/[^\s:]+)+#', '[path]', $line );
		}

		return array(
			'lines'     => $redacted,
			'available' => true,
		);
	}

	/**
	 * @param string $filepath
	 * @param int    $lines
	 * @return string
	 */
	private static function tail_file( $filepath, $lines ) {
		$fp = fopen( $filepath, 'rb' );
		if ( ! $fp ) {
			return '';
		}

		$buffer = '';
		$chunk  = 4096;
		$pos    = -1;
		$line_count = 0;
		$stat = fstat( $fp );
		$size = isset( $stat['size'] ) ? (int) $stat['size'] : 0;

		if ( 0 === $size ) {
			fclose( $fp );
			return '';
		}

		while ( $line_count <= $lines && -$pos < $size ) {
			$seek = max( -$size, $pos - $chunk );
			fseek( $fp, $seek, SEEK_END );
			$read = fread( $fp, -$seek - $pos );
			$buffer = $read . $buffer;
			$line_count = substr_count( $buffer, "\n" );
			$pos -= $chunk;
		}

		fclose( $fp );
		$parts = explode( "\n", $buffer );
		return implode( "\n", array_slice( $parts, -$lines ) );
	}
}
