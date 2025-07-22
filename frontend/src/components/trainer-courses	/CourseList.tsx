import React from 'react';

interface Course {
    id: string;
    title: string;
    description: string;
    category: string;
    duration: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    instructor: string;
    rating: number;
    enrolledStudents: number;
}

interface CourseListProps {
    courses: Course[];
    categoryFilter?: string;
}

const CourseList: React.FC<CourseListProps> = ({ courses, categoryFilter }) => {
    const filteredCourses = categoryFilter
        ? courses.filter(course => course.category === categoryFilter)
        : courses;

    const groupedCourses = filteredCourses.reduce((acc, course) => {
        if (!acc[course.category]) {
            acc[course.category] = [];
        }
        acc[course.category].push(course);
        return acc;
    }, {} as Record<string, Course[]>);

    const getLevelBadgeStyle = (level: Course['level']) => {
        const baseStyle = {
            position: 'absolute' as const,
            top: '1rem',
            right: '1rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            color: 'white'
        };

        switch (level) {
            case 'Beginner': return { ...baseStyle, background: '#2ecc71' };
            case 'Intermediate': return { ...baseStyle, background: '#f39c12' };
            case 'Advanced': return { ...baseStyle, background: '#e74c3c' };
            default: return { ...baseStyle, background: '#2ecc71' };
        }
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, index) => (
            <span
                key={index}
                style={{
                    color: index < Math.floor(rating) ? '#f39c12' : '#ddd',
                    fontSize: '1rem'
                }}
            >
        ★
      </span>
        ));
    };



    return (
        <div style={styles.container}>
            {Object.entries(groupedCourses).map(([category, categoryTours]) => (
                <div key={category} style={styles.categorySection}>
                    <h2 style={styles.categoryTitle}>{category}</h2>
                    <div style={styles.coursesGrid}>
                        {categoryTours.map((course) => (
                            <div
                                key={course.id}
                                style={styles.courseCard}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            >
                                <div style={styles.courseImage}>
                                    {course.image ? (
                                        <img src={course.image} alt={course.title} style={styles.courseImageImg} />
                                    ) : (
                                        <div style={styles.placeholderImage}>
                                            <span>📚</span>
                                        </div>
                                    )}
                                    <div style={getLevelBadgeStyle(course.level)}>
                                        {course.level}
                                    </div>
                                </div>

                                <div style={styles.courseContent}>
                                    <h3 style={styles.courseTitle}>{course.title}</h3>
                                    <p style={styles.courseDescription}>{course.description}</p>

                                    <div style={styles.courseMeta}>
                                        <div style={styles.metaItem}>
                                            <span>👨‍🏫</span>
                                            <span>{course.instructor}</span>
                                        </div>
                                        <div style={styles.metaItem}>
                                            <span>⏱️</span>
                                            <span>{course.duration}</span>
                                        </div>
                                    </div>

                                    <div style={styles.courseStats}>
                                        <div style={styles.rating}>
                                            {renderStars(course.rating)}
                                            <span style={styles.ratingValue}>({course.rating})</span>
                                        </div>
                                        <div style={styles.enrolled}>
                                            <span>👥</span>
                                            <span>{course.enrolledStudents} étudiants</span>
                                        </div>
                                    </div>

                                    <div style={styles.courseActions}>
                                        <button
                                            style={styles.btnPrimary}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#2980b9';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#3498db';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            S'inscrire
                                        </button>
                                        <button
                                            style={styles.btnSecondary}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#3498db';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = '#3498db';
                                            }}
                                        >
                                            Voir détails
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {Object.keys(groupedCourses).length === 0 && (
                <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>📖</span>
                    <h3 style={styles.emptyTitle}>Aucun cours disponible</h3>
                    <p style={styles.emptyText}>Il n'y a pas de cours dans cette catégorie pour le moment.</p>
                </div>
            )}
        </div>
    );


};

const styles = {
    container: {
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    categorySection: {
        marginBottom: '3rem'
    },
    categoryTitle: {
        fontSize: '2rem',
        fontWeight: 700,
        color: '#2c3e50',
        marginBottom: '1.5rem',
        borderBottom: '3px solid #3498db',
        paddingBottom: '0.5rem',
        display: 'inline-block'
    },
    coursesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '2rem'
    },
    courseCard: {
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        border: '1px solid #e8ecef',
        cursor: 'pointer'
    },
    courseImage: {
        position: 'relative' as const,
        height: '200px',
        overflow: 'hidden'
    },
    courseImageImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '3rem'
    },
    courseContent: {
        padding: '1.5rem'
    },
    courseTitle: {
        fontSize: '1.25rem',
        fontWeight: 600,
        color: '#2c3e50',
        marginBottom: '0.75rem',
        lineHeight: 1.4
    },
    courseDescription: {
        color: '#7f8c8d',
        lineHeight: 1.5,
        marginBottom: '1rem',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
    },
    courseMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: '#6c757d'
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    courseStats: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '1rem 0',
        borderTop: '1px solid #e8ecef',
        fontSize: '0.875rem'
    },
    rating: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    ratingValue: {
        color: '#6c757d',
        fontWeight: 500
    },
    enrolled: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#6c757d'
    },
    courseActions: {
        display: 'flex',
        gap: '1rem'
    },
    btnPrimary: {
        flex: 1,
        padding: '0.75rem 1rem',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontSize: '0.875rem',
        background: '#3498db',
        color: 'white'
    },
    btnSecondary: {
        flex: 1,
        padding: '0.75rem 1rem',
        border: '2px solid #3498db',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontSize: '0.875rem',
        background: 'transparent',
        color: '#3498db'
    },
    emptyState: {
        textAlign: 'center' as const,
        padding: '4rem 2rem',
        color: '#6c757d'
    },
    emptyIcon: {
        fontSize: '4rem',
        display: 'block',
        marginBottom: '1rem'
    },
    emptyTitle: {
        fontSize: '1.5rem',
        marginBottom: '0.5rem',
        color: '#495057'
    },
    emptyText: {
        fontSize: '1rem',
        lineHeight: 1.5
    }
};

export default CourseList;