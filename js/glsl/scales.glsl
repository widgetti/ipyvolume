#define SCALE_TYPE_LINEAR 1
#define SCALE_TYPE_LOG 2


#ifdef USE_SCALE_X
    #if SCALE_TYPE_x == SCALE_TYPE_LINEAR
        #define SCALE_X(x) scale_transform_linear(x, vec2(-0.5, 0.5), domain_x)
    #elif SCALE_TYPE_x == SCALE_TYPE_LOG
        #define SCALE_X(x) scale_transform_log(x, vec2(-0.5, 0.5), domain_x)
    #endif
#endif

#ifdef USE_SCALE_Y
    #if SCALE_TYPE_y == SCALE_TYPE_LINEAR
        #define SCALE_Y(x) scale_transform_linear(x, vec2(-0.5, 0.5), domain_y)
    #elif SCALE_TYPE_y == SCALE_TYPE_LOG
        #define SCALE_Y(x) scale_transform_log(x, vec2(-0.5, 0.5), domain_y)
    #endif
#endif

#ifdef USE_SCALE_Z
    #if SCALE_TYPE_z == SCALE_TYPE_LINEAR
        #define SCALE_Z(x) scale_transform_linear(x, vec2(-0.5, 0.5), domain_z)
    #elif SCALE_TYPE_z == SCALE_TYPE_LOG
        #define SCALE_Z(x) scale_transform_log(x, vec2(-0.5, 0.5), domain_z)
    #endif
#endif

#ifdef USE_SCALE_SIZE_X
    #if SCALE_TYPE_size_x == SCALE_TYPE_LINEAR
        #define SCALE_SIZE_X(x) scale_transform_linear(x, vec2(0.0, 1.0), domain_size_x)
    #elif SCALE_TYPE_size_x == SCALE_TYPE_LOG
        #define SCALE_SIZE_X(x) scale_transform_log(x, vec2(0.0, 1.0), domain_size_x)
    #endif
#endif

#ifdef USE_SCALE_SIZE_Y
    #if SCALE_TYPE_size_y == SCALE_TYPE_LINEAR
        #define SCALE_SIZE_Y(x) scale_transform_linear(x, vec2(0.0, 1.0), domain_size_y)
    #elif SCALE_TYPE_size_y == SCALE_TYPE_LOG
        #define SCALE_SIZE_Y(x) scale_transform_log(x, vec2(0.0, 1.0), domain_size_y)
    #endif
#endif

#ifdef USE_SCALE_SIZE_Z
    #if SCALE_TYPE_size_z == SCALE_TYPE_LINEAR
        #define SCALE_SIZE_Z(x) scale_transform_linear(x, vec2(0.0, 1.0), domain_size_z)
    #elif SCALE_TYPE_size_z == SCALE_TYPE_LOG
        #define SCALE_SIZE_Z(x) scale_transform_log(x, vec2(0.0, 1.0), domain_size_z)
    #endif
#endif

#ifdef USE_SCALE_AUX
    #if SCALE_TYPE_aux == SCALE_TYPE_LINEAR
        #define SCALE_AUX(x) scale_transform_linear(x, vec2(0.0, 1.0), domain_aux)
    #elif SCALE_TYPE_aux == SCALE_TYPE_LOG
        #define SCALE_AUX(x) scale_transform_log(x, vec2(0.0, 1.0), domain_aux)
    #endif
#endif

float scale_transform_linear(float domain_value, vec2 range, vec2 domain) {
    float normalized = (domain_value - domain[0]) / (domain[1] - domain[0]);
    float range_value = normalized * (range[1] - range[0]) + range[0];
    return range_value;
}

float scale_transform_linear_inverse(float range_value, vec2 range, vec2 domain) {
    float normalized = (range_value - range[0]) / (range[1] - range[0]);
    float domain_value = normalized * (domain[1] - domain[0]) + domain[0];
    return domain_value;
}

float scale_transform_log(float domain_value, vec2 range, vec2 domain) {
    float normalized = (log(domain_value) - log(domain[0])) / (log(domain[1]) - log(domain[0]));
    float range_value = normalized * (range[1] - range[0]) + range[0];
    return range_value;
}

float scale_transform_log_inverse(float range_value, vec2 range, vec2 domain) {
    float normalized = (range_value - range[0]) / (range[1] - range[0]);
    float domain_value = exp(normalized * (log(domain[1]) - log(domain[0])) + log(domain[0]));
    return domain_value;
}
