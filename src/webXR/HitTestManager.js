export const HitTestManager = ({ xrSession }) => {
  let hitTestSource = null;
  let hitTestSourceRequested = false;
  let localFloorReferenceSpace;

  xrSession.requestReferenceSpace('local').then(result => localFloorReferenceSpace = result);

  const requestHitTestSource = () => {
    xrSession.requestReferenceSpace('viewer')
       .then(
         (referenceSpace) => { xrSession.requestHitTestSource({ space: referenceSpace })
         .then((source) => {hitTestSource = source});
     });
     xrSession.addEventListener ('end', () => {
       hitTestSourceRequested = false;
       hitTestSource = null;

     } );
     hitTestSourceRequested = true;
   }

   const getHitTestResults = (frame) => {
     const hitTestResults = frame.getHitTestResults( hitTestSource );
     if ( hitTestResults.length ) {
         const hit = hitTestResults[0];
         const pose = hit.getPose(localFloorReferenceSpace);
         return pose.transform.matrix;
     } else {
         return [];
     }
   }

  return {
    get hitTestSource() { return hitTestSource },
    get hitTestSourceRequested() { return hitTestSourceRequested},
    requestHitTestSource,
    getHitTestResults
  }
}