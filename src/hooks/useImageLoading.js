import { useState, useEffect } from 'react';
import { getImageUrl } from '../imageUtils.js';

export const useImageLoading = (matchup) => {
  const [imageStates, setImageStates] = useState({
    left: { url: null, loading: true, hasImage: false, machineId: null },
    right: { url: null, loading: true, hasImage: false, machineId: null }
  });
  const [bothImagesReady, setBothImagesReady] = useState(false);

  // Reset image states and load images when matchup changes
  useEffect(() => {
    if (matchup && matchup.machines) {
      const validMachines = matchup.machines.filter(Boolean);
      
      // Check which machines have actually changed
      const leftMachineId = validMachines[0]?.opdb_id;
      const rightMachineId = validMachines[1]?.opdb_id;
      const leftChanged = leftMachineId !== imageStates.left.machineId;
      const rightChanged = rightMachineId !== imageStates.right.machineId;
      
      // Check if machines have changed
      
      // If no machines have changed, do nothing
      if (!leftChanged && !rightChanged) {
        // No machines changed, skipping image update
        return;
      }
      
      // Load both images simultaneously
      const loadBothImages = async () => {
        if (validMachines.length < 2) {
          // Reset state when we don't have enough machines
          setImageStates(prev => ({
            ...prev,
            left: { url: null, loading: false, hasImage: false, machineId: validMachines[0]?.opdb_id },
            right: { url: null, loading: false, hasImage: false, machineId: validMachines[1]?.opdb_id }
          }));
          setBothImagesReady(true);
          return;
        }

        try {
          // Check if both machines have potential images first
          const leftHasImage = validMachines[0]?.images?.find(img => img.type === 'backglass')?.urls?.large;
          const rightHasImage = validMachines[1]?.images?.find(img => img.type === 'backglass')?.urls?.large;
          
          // Update state, preserving unchanged machines' images
          setImageStates(prev => ({
            left: {
              url: leftChanged ? null : prev.left.url,
              loading: leftChanged ? !!leftHasImage : false,
              hasImage: leftChanged ? !!leftHasImage : prev.left.hasImage,
              machineId: leftMachineId
            },
            right: {
              url: rightChanged ? null : prev.right.url,
              loading: rightChanged ? !!rightHasImage : false,
              hasImage: rightChanged ? !!rightHasImage : prev.right.hasImage,
              machineId: rightMachineId
            }
          }));

          // Only load images for machines that have changed
          const promises = [];
          
          if (leftChanged && leftHasImage) {
            promises.push(
              getImageUrl(validMachines[0], 'large')
                .then(url => ({ side: 'left', url, success: true }))
                .catch(() => ({ side: 'left', url: null, success: false }))
            );
          }
          
          if (rightChanged && rightHasImage) {
            promises.push(
              getImageUrl(validMachines[1], 'large')
                .then(url => ({ side: 'right', url, success: true }))
                .catch(() => ({ side: 'right', url: null, success: false }))
            );
          }

          // If no new images to load, mark as ready immediately
          if (promises.length === 0) {
            // No new images to load, so we're ready immediately
            setBothImagesReady(true);
            return;
          }
          
          // Only reset ready state if we actually have new images to load
          // This prevents showing loading spinners for unchanged machines
          if (promises.length > 0) {
            setBothImagesReady(false);
          }

          // Wait for new images to load
          const results = await Promise.all(promises);
          
          setImageStates(prevState => {
            const newState = { ...prevState };
            
            results.forEach(({ side, url, success }) => {
              newState[side] = {
                url: success ? url : null,
                loading: false,
                hasImage: newState[side].hasImage,
                machineId: newState[side].machineId
              };
            });
            
            // Check if both images are ready (either loaded or don't have images)
            const leftReady = !newState.left.loading;
            const rightReady = !newState.right.loading;
            const bothReady = leftReady && rightReady;
            
            if (bothReady) {
              setBothImagesReady(true);
            }
            
            return newState;
          });
        } catch (err) {
          // On error, mark both as ready to prevent infinite loading
          setImageStates(prev => ({
            ...prev,
            left: { url: null, loading: false, hasImage: false, machineId: validMachines[0]?.opdb_id },
            right: { url: null, loading: false, hasImage: false, machineId: validMachines[1]?.opdb_id }
          }));
          setBothImagesReady(true);
        }
      };

      loadBothImages();
    }
  }, [matchup?.machines?.map(m => m.opdb_id).join(','), imageStates.left.machineId, imageStates.right.machineId]);

  return {
    imageStates,
    bothImagesReady
  };
}; 