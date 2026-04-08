export const TILE_SIZE = 64;

export const Physics = {
    DEFAULT_SPEED: 1.5,
    CHASE_SPEED_MULTIPLIER: 1.2,
    CHASE_SPEED_MULTIPLIER_FAST: 1.5,
    DELTA_TIME: 0.016, // ~60 FPS
};

export const Timers = {
    // in milliseconds
    ANIMAL_SOUND_COOLDOWN_MS: 4000,

    // in frames (assuming 60fps)
    HEN_LAYING_INTERVAL_GAME_MINUTES: 720,
    HEN_NESTING_DURATION_PER_EGG_FRAMES: 180,
    ANIMAL_ANIMATION_SPEED_FRAMES: 10,
    ANIMAL_FAST_ANIMATION_SPEED_FRAMES: 5,
    WORM_ANIMATION_FRAME_TIME_S: 0.2,
    MIN_WAIT_FRAMES: 60,
    MAX_WAIT_VARIATION_FRAMES: 120,
    SHORT_WAIT_FRAMES: 20,
};

export const AI = {
    // Distances in pixels
    SOUND_PROXIMITY: 192, // 3 tiles
    EAT_WORM_DISTANCE: 20,
    CAT_CATCH_PREY_DISTANCE: 32,
    MIN_SEPARATION_DISTANCE: 40,

    // Radii in pixels
    WORM_VISION_RADIUS: 192,
    PREY_VISION_RADIUS: 256, // Cat vision
    MOTHER_VISION_RADIUS: 300, // Duckling/Chicken vision for mother
    PROTECTION_RADIUS: 192, // Hen/Rooster protecting chicken

    // Probabilities & Ranges
    LONG_MOVE_CHANCE: 0.3,
    DIRECTION_PERSISTENCE_CHANCE: 0.7,
    NEST_SEARCH_RADIUS_TILES: 8,
};

export const Visuals = {
    DEFAULT_SOUND_VOLUME: 0.3,
    SCALE: {
        DUCK: 0.5,
        DUCKLING: 0.35,
        HEN: 0.5,
        ROOSTER: 0.5,
        CHICKEN: 0.5,
        CAT_ADULT: 1.5,
        CAT_KITTEN: 1.0,
        DOG_ADULT: 1.5,
        DOG_KITTEN: 1.0,
        MOUSE: 0.4,
        WORM: 0.35,
        FISH: 0.5,
    }
};

export const GameConstants = {
    TILE_SIZE,
    Physics,
    Timers,
    AI,
    Visuals
};