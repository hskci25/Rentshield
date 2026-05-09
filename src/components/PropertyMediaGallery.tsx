import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PropertyMedia } from '../data/mockProperties';
import { colors, spacing, typography } from '../theme/tokens';

interface PropertyMediaGalleryProps {
  media: PropertyMedia[];
}

export default function PropertyMediaGallery({
  media,
}: PropertyMediaGalleryProps): React.JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (media.length === 0) {
    return null;
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {media.map((item, index) => (
          <Pressable
            key={`${item.type}-${index}`}
            style={({ pressed }) => [
              styles.tile,
              pressed && styles.tilePressed,
            ]}
            onPress={() => setActiveIndex(index)}
          >
            <Image
              source={{ uri: item.thumbnailUrl ?? item.url }}
              style={styles.tileImage}
              resizeMode="cover"
            />
            {item.type === 'video' && (
              <View style={styles.videoBadge} pointerEvents="none">
                <View style={styles.videoBadgeInner}>
                  <Text style={styles.videoBadgeIcon}>▶</Text>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <Modal
        visible={activeIndex !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setActiveIndex(null)}
      >
        {activeIndex !== null && (
          <MediaViewer
            item={media[activeIndex]}
            onClose={() => setActiveIndex(null)}
          />
        )}
      </Modal>
    </>
  );
}

interface MediaViewerProps {
  item: PropertyMedia;
  onClose: () => void;
}

function MediaViewer({ item, onClose }: MediaViewerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.viewerRoot, { paddingTop: insets.top }]}>
      {item.type === 'photo' ? (
        <Image source={{ uri: item.url }} style={styles.viewerImage} resizeMode="contain" />
      ) : (
        <VideoPlayerSection url={item.url} />
      )}
      <Pressable
        onPress={onClose}
        style={[styles.closeButton, { top: insets.top + spacing.md }]}
        hitSlop={10}
      >
        <Text style={styles.closeButtonText}>CLOSE</Text>
      </Pressable>
    </View>
  );
}

interface VideoPlayerSectionProps {
  url: string;
}

function VideoPlayerSection({ url }: VideoPlayerSectionProps): React.JSX.Element {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.play();
  });

  // Surface play state changes so the component re-renders without warnings.
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // Player may already be released.
      }
    };
  }, [player]);

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        allowsFullscreen
        allowsPictureInPicture={false}
      />
      {status === 'loading' && (
        <View style={styles.videoStatusBadge} pointerEvents="none">
          <Text style={styles.videoStatusText}>LOADING...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  tile: {
    width: 140,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  tilePressed: {
    opacity: 0.85,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeIcon: {
    color: colors.onInk,
    fontSize: 16,
    marginLeft: 2,
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerImage: {
    flex: 1,
    width: '100%',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
    width: '100%',
  },
  videoStatusBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
  },
  videoStatusText: {
    color: colors.onInk,
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
  },
  closeButtonText: {
    color: colors.onInk,
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    letterSpacing: 1.4,
  },
});
