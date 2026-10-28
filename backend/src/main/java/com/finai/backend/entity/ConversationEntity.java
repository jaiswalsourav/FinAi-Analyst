package com.finai.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.ManyToOne;

@Entity
@Table(name="conversation")

public class ConversationEntity {

    @Id @Generated Value(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne (
            fetch = FetchType.LAZY,
            optional = false
    
        )
        @JoinColumn(name = "user_id", nullable = false)
        private UserEntity user;
        @Column(nullable = false)
        private String title;
        private String symbol;

        @Column(name = "created_at", nullable = false)
        private LocalDateTime createdAt;

        @Column (name = "updated_at", nullable = false)
        private LocalDateTime updatedAt;

        // Getters and Setters
}
