import React from 'react';
import { Document, Page, Image, View, Text, StyleSheet, Font } from '@react-pdf/renderer';

// Standard Architectural Paper Sizes (in points: 1/72 inch)
// Defined in PORTRAIT [Short, Long]. Export logic handles flipping.
export const PAPER_SIZES = {
    ARCH_D: [1728, 2592], // 24x36 inches
    ARCH_E: [2592, 3456], // 36x48 inches
    ARCH_A1: [1684, 2384], // 594x841 mm
};

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#ffffff',
        padding: 20,
        flexDirection: 'row',
    },
    mainContent: {
        flex: 1,
        border: '1pt solid #000',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    floorPlanImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    titleBlock: {
        width: 280,
        borderLeft: '2pt solid #000',
        paddingLeft: 20,
        paddingRight: 10,
        paddingTop: 15,
        paddingBottom: 15,
        flexDirection: 'column',
    },
    branding: {
        marginBottom: 40,
        borderBottom: '1pt solid #ccc',
        paddingBottom: 20,
    },
    logo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    projectName: {
        fontSize: 18,
        fontWeight: 'heavy',
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    projectLocation: {
        fontSize: 10,
        color: '#444',
        marginBottom: 20,
    },
    metadataContainer: {
        marginTop: 'auto',
        borderTop: '2pt solid #000',
        paddingTop: 10,
    },
    metaLabel: {
        fontSize: 8,
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 10,
        marginBottom: 8,
        fontWeight: 'bold',
    },
    pageInfo: {
        marginTop: 20,
        borderTop: '1pt solid #eee',
        paddingTop: 10,
    },
    pageTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    scaleInfo: {
        fontSize: 9,
        fontStyle: 'italic',
    }
});

interface ExportDocumentProps {
    image: string;
    projectInfo: {
        name: string;
        location?: string;
        date: string;
        revision: string;
        scaleTxt: string;
    };
    pageTitle: string;
    paperSize: keyof typeof PAPER_SIZES;
    orientation?: 'landscape' | 'portrait';
}

export const ExportDocument: React.FC<ExportDocumentProps> = ({
    image,
    projectInfo,
    pageTitle,
    paperSize,
    orientation = 'landscape'
}) => {
    const [v1, v2] = PAPER_SIZES[paperSize];
    const short = Math.min(v1, v2);
    const long = Math.max(v1, v2);
    const actualWidth = orientation === 'landscape' ? long : short;
    const actualHeight = orientation === 'landscape' ? short : long;

    return (
        <Document title={`${projectInfo.name} - ${pageTitle}`}>
            <Page size={[actualWidth, actualHeight]} style={[
                styles.page,
                orientation === 'portrait' ? { flexDirection: 'column' } : { flexDirection: 'row' }
            ]}>
                {/* Main Floor Plan Area */}
                <View style={[
                    styles.mainContent,
                    orientation === 'portrait' ? { marginRight: 0, marginBottom: 10 } : { marginRight: 10 }
                ]}>
                    <Image src={image} style={styles.floorPlanImage} />
                </View>

                {/* Architectural Title Block */}
                <View style={[
                    styles.titleBlock,
                    orientation === 'portrait'
                        ? { width: '100%', height: 180, borderLeft: 'none', borderTop: '2pt solid #000', paddingLeft: 0, paddingTop: 10, flexDirection: 'row' }
                        : { height: '100%' }
                ]}>
                    <View style={orientation === 'portrait'
                        ? { flex: 1, borderRight: '1pt solid #ccc', marginRight: 15, paddingRight: 15 }
                        : styles.branding
                    }>
                        {orientation === 'landscape' ? (
                            <View style={{ marginBottom: 60, marginTop: 20 }}>
                                <Text style={[styles.logo, { transform: 'rotate(-90deg)', transformOrigin: 'left top', marginLeft: 30, width: 300 }]}>
                                    INTEGRATOR PRO
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.logo}>INTEGRATOR PRO</Text>
                        )}

                        <Text style={{ fontSize: 8, color: '#666', marginTop: orientation === 'landscape' ? 20 : 0 }}>
                            Engineered Automation Systems
                        </Text>

                        <View style={{ marginTop: 30 }}>
                            <Text style={styles.metaLabel}>Project</Text>
                            <Text style={styles.projectName}>{projectInfo.name}</Text>
                            <Text style={styles.projectLocation}>{projectInfo.location || 'Site Location'}</Text>
                        </View>
                    </View>

                    <View style={orientation === 'portrait' ? { flex: 1 } : {}}>
                        <View style={styles.pageInfo}>
                            <Text style={styles.metaLabel}>Drawing Title</Text>
                            <Text style={styles.pageTitle}>{pageTitle}</Text>
                        </View>

                        <View style={styles.metadataContainer}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={styles.metaLabel}>Date</Text>
                                    <Text style={styles.metaValue}>{projectInfo.date}</Text>
                                </View>
                                <View>
                                    <Text style={styles.metaLabel}>Revision</Text>
                                    <Text style={styles.metaValue}>{projectInfo.revision}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <View>
                                    <Text style={styles.metaLabel}>Scale</Text>
                                    <Text style={styles.metaValue}>{projectInfo.scaleTxt || 'Not to Scale'}</Text>
                                </View>

                                <View style={{ backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 5, minWidth: 80 }}>
                                    <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>
                                        E-101
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};
