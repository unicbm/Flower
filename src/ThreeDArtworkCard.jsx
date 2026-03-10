import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function detectWebglSupport() {
  if (typeof document === "undefined") {
    return false;
  }
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
}

function useReducedQuality() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return (
      window.innerWidth < 820 ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    function sync() {
      setReduced(
        window.innerWidth < 820 ||
          window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
      );
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return reduced;
}

function createBloomMaterial(material, color, alternateColor) {
  if (material === "glass") {
    return {
      type: "physical",
      props: {
        color,
        roughness: 0.14,
        metalness: 0.04,
        clearcoat: 0.9,
        clearcoatRoughness: 0.18,
        transmission: 0.18,
        transparent: true,
        opacity: 0.8,
        emissive: alternateColor,
        emissiveIntensity: 0.08,
      },
    };
  }
  if (material === "pearl") {
    return {
      type: "physical",
      props: {
        color,
        roughness: 0.66,
        metalness: 0.06,
        clearcoat: 0.14,
        clearcoatRoughness: 0.48,
        iridescence: 0.06,
      },
    };
  }
  return {
    type: "standard",
    props: {
      color,
      roughness: 0.9,
      metalness: 0.04,
      emissive: alternateColor,
      emissiveIntensity: 0.015,
    },
  };
}

function BloomMaterial({ material, color, alternateColor }) {
  const definition = createBloomMaterial(material, color, alternateColor);
  if (definition.type === "physical") {
    return <meshPhysicalMaterial {...definition.props} />;
  }
  return <meshStandardMaterial {...definition.props} />;
}

function Stem({ flower, reducedQuality }) {
  const target = useMemo(
    () => new THREE.Vector3(...flower.position).sub(new THREE.Vector3(...flower.stemOrigin)),
    [flower.position, flower.stemOrigin],
  );
  const geometry = useMemo(() => {
    const bendX = target.x * 0.32 + Math.sin(flower.rotation[1]) * 0.5;
    const bendZ = target.z * 0.32 + Math.cos(flower.rotation[1]) * 0.36;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(bendX * 0.18, target.y * 0.34, bendZ * 0.12),
      new THREE.Vector3(target.x * 0.56 + bendX * 0.16, target.y * 0.76, target.z * 0.56 + bendZ * 0.16),
      target,
    ]);
    return new THREE.TubeGeometry(curve, reducedQuality ? 22 : 34, 0.038, 8, false);
  }, [flower.rotation, reducedQuality, target]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={flower.stemColor}
        roughness={0.86}
        metalness={0.04}
        emissive={flower.stemColor}
        emissiveIntensity={0.03}
      />
    </mesh>
  );
}

function Leaves({ flower }) {
  const target = useMemo(
    () => new THREE.Vector3(...flower.position).sub(new THREE.Vector3(...flower.stemOrigin)),
    [flower.position, flower.stemOrigin],
  );

  return flower.leafPairs.map((leaf) => {
    const ratio = THREE.MathUtils.clamp(leaf.offset / Math.max(target.y, 0.001), 0.12, 0.94);
    const base = target.clone().multiplyScalar(ratio);
    const spread = new THREE.Vector3(leaf.side * (0.18 + ratio * 0.22), 0.04, leaf.side * 0.1);
    const position = base.add(spread);

    return (
      <mesh
        key={leaf.id}
        position={position.toArray()}
        rotation={[leaf.twist, leaf.side * 0.46, leaf.side * 0.82]}
        scale={[leaf.size * 0.55, leaf.size, leaf.size * 0.18]}
        castShadow
      >
        <sphereGeometry args={[1, 18, 18]} />
        <meshStandardMaterial
          color={leaf.color}
          roughness={0.78}
          metalness={0.03}
          emissive={leaf.accent}
          emissiveIntensity={0.05}
        />
      </mesh>
    );
  });
}

function Bloom({ flower, reducedQuality }) {
  const bloomGroup = useRef(null);
  const petalGeometry = useMemo(() => new THREE.SphereGeometry(1, reducedQuality ? 16 : 24, reducedQuality ? 12 : 20), [reducedQuality]);
  const primaryColor = useMemo(() => new THREE.Color(flower.petalColor), [flower.petalColor]);
  const secondaryColor = useMemo(() => new THREE.Color(flower.petalColorAlt), [flower.petalColorAlt]);

  useEffect(() => () => petalGeometry.dispose(), [petalGeometry]);

  useFrame((state) => {
    if (!bloomGroup.current) {
      return;
    }
    const t = state.clock.elapsedTime;
    bloomGroup.current.rotation.x = flower.rotation[0] + Math.sin(t * 0.75 + flower.swayPhase) * flower.swayAmplitude;
    bloomGroup.current.rotation.y = flower.rotation[1] + Math.cos(t * 0.42 + flower.swayPhase) * flower.swayAmplitude * 0.8;
    bloomGroup.current.rotation.z = flower.rotation[2] + Math.sin(t * 0.66 + flower.swayPhase) * flower.swayAmplitude * 0.7;
  });

  const layerScale = 1 / Math.max(1, flower.layers);
  const petals = [];

  for (let layerIndex = 0; layerIndex < flower.layers; layerIndex += 1) {
    const layerRatio = layerIndex * layerScale;
    const petalCount = flower.petalCount + (flower.species === "starburst" ? layerIndex * 2 : 0);
    const radius = 0.18 + layerRatio * 0.24;
    for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
      const angle = (Math.PI * 2 * petalIndex) / petalCount + layerIndex * 0.22;
      const lift = layerRatio * 0.16;
      const openness = flower.openness + layerRatio * 0.22;
      const droop = flower.droop + layerRatio * 0.12;
      const scale = [
        flower.petalWidth * flower.scale * (1 - layerRatio * 0.08),
        flower.petalLength * flower.scale * (1 - layerRatio * 0.05),
        flower.petalDepth * flower.scale * (1 - layerRatio * 0.05),
      ];
      const position = [
        Math.cos(angle) * radius * flower.scale,
        lift,
        Math.sin(angle) * radius * flower.scale,
      ];
      const rotation = [
        Math.PI / 2 - droop,
        angle,
        Math.sin(angle * 2 + flower.swayPhase) * 0.16 + openness * 0.34,
      ];
      const petalColor = primaryColor
        .clone()
        .lerp(
          secondaryColor,
          THREE.MathUtils.clamp(0.08 + layerRatio * 0.2 + (Math.sin(petalIndex * 1.37 + layerIndex * 0.82) + 1) * 0.07, 0, 0.38),
        )
        .getStyle();
      petals.push(
        <mesh
          key={`${flower.id}-petal-${layerIndex}-${petalIndex}`}
          geometry={petalGeometry}
          position={position}
          rotation={rotation}
          scale={scale}
          castShadow
        >
          <BloomMaterial
            material={flower.material}
            color={petalColor}
            alternateColor={flower.petalColorAlt}
          />
        </mesh>,
      );
    }
  }

  return (
    <group ref={bloomGroup} position={flower.stemOrigin}>
      <Stem flower={flower} reducedQuality={reducedQuality} />
      <Leaves flower={flower} />
      <group position={new THREE.Vector3(...flower.position).sub(new THREE.Vector3(...flower.stemOrigin)).toArray()}>
        {petals}
        <mesh scale={[flower.centerRadius * flower.scale, flower.centerRadius * flower.scale, flower.centerRadius * flower.scale]} castShadow>
          <sphereGeometry args={[1, reducedQuality ? 18 : 26, reducedQuality ? 18 : 26]} />
          <meshStandardMaterial
            color={flower.coreColor}
            roughness={0.34}
            metalness={0.26}
            emissive={flower.coreColor}
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>
    </group>
  );
}

function SculpturalArcs({ arcs }) {
  return arcs.map((arc) => (
    <mesh
      key={arc.id}
      position={[0, arc.y, 0]}
      rotation={arc.rotation}
      scale={[1, 1, 1]}
    >
      <torusGeometry args={[arc.radius, arc.tube, 10, 80, Math.PI * 1.38]} />
      <meshStandardMaterial
        color={arc.color}
        roughness={0.28}
        metalness={0.08}
        transparent
        opacity={arc.opacity}
      />
    </mesh>
  ));
}

function Atmosphere({ atmosphere, reducedQuality }) {
  const motes = reducedQuality ? atmosphere.motes.slice(0, Math.ceil(atmosphere.motes.length * 0.55)) : atmosphere.motes;
  return motes.map((mote) => (
    <mesh key={mote.id} position={mote.position} scale={[mote.radius, mote.radius, mote.radius]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color={mote.color} transparent opacity={mote.opacity} />
    </mesh>
  ));
}

function Pedestal({ color }) {
  return (
    <group position={[0, -3.08, 0]}>
      <mesh receiveShadow scale={[2.3, 0.18, 2.3]}>
        <cylinderGeometry args={[1, 1.05, 1, 40]} />
        <meshStandardMaterial color={color} roughness={0.76} metalness={0.08} />
      </mesh>
      <mesh receiveShadow position={[0, 0.18, 0]} scale={[1.6, 0.08, 1.6]}>
        <cylinderGeometry args={[1, 1, 1, 40]} />
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.06} />
      </mesh>
    </group>
  );
}

function AutoFitCamera({ targetRef, cameraProfile }) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!targetRef.current) {
      return;
    }
    const box = new THREE.Box3().setFromObject(targetRef.current);
    if (box.isEmpty()) {
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const bounds = box.getSize(new THREE.Vector3());
    const dominantSize = Math.max(bounds.x * 0.72, bounds.y, bounds.z * 0.9, 1);
    const fovRadians = (cameraProfile.fov * Math.PI) / 180;
    const fitHeightDistance = dominantSize / (2 * Math.tan(fovRadians / 2));
    const fitWidthDistance = fitHeightDistance / Math.max(size.width / Math.max(size.height, 1), 0.65);
    const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.34;
    const direction = new THREE.Vector3(...cameraProfile.position).normalize();
    camera.position.copy(center.clone().add(direction.multiplyScalar(distance)));
    camera.lookAt(center.x, center.y + bounds.y * 0.04, center.z);
    camera.updateProjectionMatrix();
  }, [camera, cameraProfile.fov, cameraProfile.position, size.height, size.width, targetRef]);

  return null;
}

function SceneContent({ scene, reducedQuality }) {
  const root = useRef(null);

  useFrame((state) => {
    if (!root.current) {
      return;
    }
    const t = state.clock.elapsedTime;
    root.current.rotation.y = Math.sin(t * 0.08) * 0.06;
    root.current.position.y = Math.sin(t * 0.24) * 0.018;
  });

  return (
    <>
      <fog attach="fog" args={[scene.atmosphere.fogColor, scene.atmosphere.fogNear, scene.atmosphere.fogFar]} />
      <ambientLight color={scene.lightingProfile.ambient.color} intensity={scene.lightingProfile.ambient.intensity} />
      <directionalLight
        position={scene.lightingProfile.key.position}
        intensity={scene.lightingProfile.key.intensity}
        color={scene.lightingProfile.key.color}
        castShadow={!reducedQuality}
        shadow-mapSize-width={reducedQuality ? 512 : 1024}
        shadow-mapSize-height={reducedQuality ? 512 : 1024}
      />
      <pointLight
        position={scene.lightingProfile.rim.position}
        intensity={scene.lightingProfile.rim.intensity}
        color={scene.lightingProfile.rim.color}
      />
      <pointLight
        position={scene.lightingProfile.floor.position}
        intensity={scene.lightingProfile.floor.intensity}
        color={scene.lightingProfile.floor.color}
      />
      <AutoFitCamera targetRef={root} cameraProfile={scene.cameraProfile} />
      <group ref={root}>
        <SculpturalArcs arcs={scene.sculpturalArcs} />
        <Atmosphere atmosphere={scene.atmosphere} reducedQuality={reducedQuality} />
        {scene.flowers.map((flower) => (
          <Bloom key={flower.id} flower={flower} reducedQuality={reducedQuality} />
        ))}
        {scene.pedestal ? <Pedestal color={scene.pedestal.color} /> : null}
      </group>
    </>
  );
}

export function ThreeDArtworkCard({ scene, artKey }) {
  const reducedQuality = useReducedQuality();
  const [hasWebgl, setHasWebgl] = useState(() => detectWebglSupport());

  useEffect(() => {
    setHasWebgl(detectWebglSupport());
  }, []);

  return (
    <div className="art-scene art-scene--three-d">
      <div className="art-frame art-frame--three-d">
        <div className="art-frame-shine" aria-hidden="true" />
        <div
          className="art-three-wrap"
          key={artKey}
          style={{
            background: `linear-gradient(180deg, ${scene.background.top}, ${scene.background.middle} 48%, ${scene.background.bottom})`,
          }}
        >
          {hasWebgl ? (
            <>
              <Canvas
                className="art-canvas"
                dpr={reducedQuality ? [1, 1.2] : [1, 1.8]}
                gl={{
                  antialias: !reducedQuality,
                  alpha: true,
                  powerPreference: reducedQuality ? "default" : "high-performance",
                }}
                camera={{
                  position: scene.cameraProfile.position,
                  fov: scene.cameraProfile.fov,
                }}
                shadows={!reducedQuality}
              >
                <SceneContent scene={scene} reducedQuality={reducedQuality} />
              </Canvas>
              <div className="three-overlay" aria-hidden="true">
                <span>{scene.sceneType.replace("-", " ")}</span>
                <span>{scene.palette.name}</span>
                <span>experimental sculpture</span>
              </div>
            </>
          ) : (
            <div className="three-fallback" role="img" aria-label="3D rendering is unavailable on this device">
              <strong>3D preview unavailable</strong>
              <span>This browser could not start WebGL. Bouquet, Abstract, and Relief modes still work.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
