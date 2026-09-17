#!/usr/bin/env python3
"""Write a minimal Xcode project for SearchBuddyViews."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJ = ROOT / "SearchBuddyViews.xcodeproj"
PROJ.mkdir(parents=True, exist_ok=True)
SHARED = PROJ / "xcshareddata" / "xcschemes"
SHARED.mkdir(parents=True, exist_ok=True)

APP_SOURCES = [
    ("SearchBuddyViewsApp.swift", "SearchBuddyViews"),
    ("ContentView.swift", "SearchBuddyViews"),
    ("ViewModels.swift", "SearchBuddyViews/Models"),
    ("AppPaths.swift", "SearchBuddyViews/Models"),
    ("FixtureLocator.swift", "SearchBuddyViews/Models"),
    ("FileWatcher.swift", "SearchBuddyViews/Services"),
    ("ViewStore.swift", "SearchBuddyViews/Services"),
    ("FieldViews.swift", "SearchBuddyViews/Views"),
    ("CardsLayoutView.swift", "SearchBuddyViews/Views"),
    ("TableLayoutView.swift", "SearchBuddyViews/Views"),
    ("EmptyStateView.swift", "SearchBuddyViews/Views"),
]

TEST_SOURCES = [
    ("ViewDocumentDecodeTests.swift", "SearchBuddyViewsTests"),
    ("FileWatcherTests.swift", "SearchBuddyViewsTests"),
    ("ViewStoreTests.swift", "SearchBuddyViewsTests"),
]


def nid(n: int) -> str:
    return f"A1{n:022X}"


ids = {
    "project": nid(1),
    "app_target": nid(2),
    "test_target": nid(3),
    "app_product": nid(4),
    "test_product": nid(5),
    "app_sources": nid(6),
    "app_resources": nid(7),
    "test_sources": nid(8),
    "app_build_config_list": nid(9),
    "test_build_config_list": nid(10),
    "project_build_config_list": nid(11),
    "app_debug": nid(12),
    "app_release": nid(13),
    "test_debug": nid(14),
    "test_release": nid(15),
    "proj_debug": nid(16),
    "proj_release": nid(17),
    "group_root": nid(18),
    "group_app": nid(19),
    "group_models": nid(20),
    "group_services": nid(21),
    "group_views": nid(22),
    "group_tests": nid(23),
    "group_products": nid(24),
    "assets": nid(25),
    "assets_build": nid(26),
    "test_dep": nid(27),
    "test_proxy": nid(28),
}

file_ids = {}
build_ids = {}
n = 40
for name, _ in APP_SOURCES + TEST_SOURCES:
    file_ids[name] = nid(n)
    n += 1
    build_ids[name] = nid(n)
    n += 1


def file_ref(name: str, path: str, ftype: str) -> str:
    return (
        f"\t\t{file_ids[name]} /* {name} */ = "
        f"{{isa = PBXFileReference; lastKnownFileType = {ftype}; "
        f"path = {name}; sourceTree = \"<group>\"; }};"
    )


objects = []

for name, folder in APP_SOURCES:
    objects.append(file_ref(name, folder, "sourcecode.swift"))
for name, folder in TEST_SOURCES:
    objects.append(file_ref(name, folder, "sourcecode.swift"))

objects.append(
    f"\t\t{ids['app_product']} /* SearchBuddyViews.app */ = "
    "{isa = PBXFileReference; explicitFileType = wrapper.application; "
    "includeInIndex = 0; path = SearchBuddyViews.app; sourceTree = BUILT_PRODUCTS_DIR; };"
)
objects.append(
    f"\t\t{ids['test_product']} /* SearchBuddyViewsTests.xctest */ = "
    "{isa = PBXFileReference; explicitFileType = wrapper.cfbundle; "
    "includeInIndex = 0; path = SearchBuddyViewsTests.xctest; sourceTree = BUILT_PRODUCTS_DIR; };"
)
objects.append(
    f"\t\t{ids['assets']} /* Assets.xcassets */ = "
    "{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; "
    "path = Assets.xcassets; sourceTree = \"<group>\"; };"
)

# Build files
for name, _ in APP_SOURCES + TEST_SOURCES:
    objects.append(
        f"\t\t{build_ids[name]} /* {name} in Sources */ = "
        f"{{isa = PBXBuildFile; fileRef = {file_ids[name]} /* {name} */; }};"
    )
objects.append(
    f"\t\t{ids['assets_build']} /* Assets.xcassets in Resources */ = "
    f"{{isa = PBXBuildFile; fileRef = {ids['assets']} /* Assets.xcassets */; }};"
)

app_children = [
    file_ids["SearchBuddyViewsApp.swift"],
    file_ids["ContentView.swift"],
    ids["group_models"],
    ids["group_services"],
    ids["group_views"],
    ids["assets"],
]

objects += [
    f"""\t\t{ids['group_models']} /* Models */ = {{
			isa = PBXGroup;
			children = (
				{file_ids['ViewModels.swift']} /* ViewModels.swift */,
				{file_ids['AppPaths.swift']} /* AppPaths.swift */,
				{file_ids['FixtureLocator.swift']} /* FixtureLocator.swift */,
			);
			path = Models;
			sourceTree = "<group>";
		}};""",
    f"""\t\t{ids['group_services']} /* Services */ = {{
			isa = PBXGroup;
			children = (
				{file_ids['FileWatcher.swift']} /* FileWatcher.swift */,
				{file_ids['ViewStore.swift']} /* ViewStore.swift */,
			);
			path = Services;
			sourceTree = "<group>";
		}};""",
    f"""\t\t{ids['group_views']} /* Views */ = {{
			isa = PBXGroup;
			children = (
				{file_ids['FieldViews.swift']} /* FieldViews.swift */,
				{file_ids['CardsLayoutView.swift']} /* CardsLayoutView.swift */,
				{file_ids['TableLayoutView.swift']} /* TableLayoutView.swift */,
				{file_ids['EmptyStateView.swift']} /* EmptyStateView.swift */,
			);
			path = Views;
			sourceTree = "<group>";
		}};""",
    f"""\t\t{ids['group_app']} /* SearchBuddyViews */ = {{
			isa = PBXGroup;
			children = (
				{file_ids['SearchBuddyViewsApp.swift']} /* SearchBuddyViewsApp.swift */,
				{file_ids['ContentView.swift']} /* ContentView.swift */,
				{ids['group_models']} /* Models */,
				{ids['group_services']} /* Services */,
				{ids['group_views']} /* Views */,
				{ids['assets']} /* Assets.xcassets */,
			);
			path = SearchBuddyViews;
			sourceTree = "<group>";
		}};""",
    f"""\t\t{ids['group_tests']} /* SearchBuddyViewsTests */ = {{
			isa = PBXGroup;
			children = (
				{file_ids['ViewDocumentDecodeTests.swift']} /* ViewDocumentDecodeTests.swift */,
				{file_ids['FileWatcherTests.swift']} /* FileWatcherTests.swift */,
				{file_ids['ViewStoreTests.swift']} /* ViewStoreTests.swift */,
			);
			path = SearchBuddyViewsTests;
			sourceTree = "<group>";
		}};""",
    f"""\t\t{ids['group_products']} /* Products */ = {{
			isa = PBXGroup;
			children = (
				{ids['app_product']} /* SearchBuddyViews.app */,
				{ids['test_product']} /* SearchBuddyViewsTests.xctest */,
			);
			name = Products;
			sourceTree = "<group>";
		}};""",
    f"""\t\t{ids['group_root']} = {{
			isa = PBXGroup;
			children = (
				{ids['group_app']} /* SearchBuddyViews */,
				{ids['group_tests']} /* SearchBuddyViewsTests */,
				{ids['group_products']} /* Products */,
			);
			sourceTree = "<group>";
		}};""",
    f"""\t\t{ids['app_sources']} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
{chr(10).join(f"				{build_ids[name]} /* {name} in Sources */," for name, _ in APP_SOURCES)}
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};""",
    f"""\t\t{ids['app_resources']} /* Resources */ = {{
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				{ids['assets_build']} /* Assets.xcassets in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};""",
    f"""\t\t{ids['test_sources']} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
{chr(10).join(f"				{build_ids[name]} /* {name} in Sources */," for name, _ in TEST_SOURCES)}
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};""",
]

common_proj = """
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_NO_COMMON_BLOCKS = YES;
				MACOSX_DEPLOYMENT_TARGET = 14.4;
				SDKROOT = macosx;
				SWIFT_VERSION = 5.0;
"""

objects += [
    f"""\t\t{ids['proj_debug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{{common_proj}
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				ENABLE_TESTABILITY = YES;
				ONLY_ACTIVE_ARCH = YES;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			}};
			name = Debug;
		}};""",
    f"""\t\t{ids['proj_release']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{{common_proj}
				SWIFT_COMPILATION_MODE = wholemodule;
			}};
			name = Release;
		}};""",
    f"""\t\t{ids['app_debug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_IDENTITY = "-";
				CODE_SIGNING_REQUIRED = NO;
				COMBINE_HIDPI_IMAGES = YES;
				CURRENT_PROJECT_VERSION = 1;
				DEFINES_MODULE = YES;
				ENABLE_APP_SANDBOX = NO;
				ENABLE_TESTABILITY = YES;
				GENERATE_INFOPLIST_FILE = YES;
				SWIFT_ENABLE_EXPLICIT_MODULES = NO;
				INFOPLIST_KEY_CFBundleDisplayName = "SearchBuddy Views";
				INFOPLIST_KEY_LSApplicationCategoryType = "public.app-category.productivity";
				INFOPLIST_KEY_NSHighResolutionCapable = YES;
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/../Frameworks";
				MACOSX_DEPLOYMENT_TARGET = 14.4;
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.searchbuddy.views;
				PRODUCT_NAME = SearchBuddyViews;
				SDKROOT = macosx;
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
			}};
			name = Debug;
		}};""",
    f"""\t\t{ids['app_release']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_IDENTITY = "-";
				CODE_SIGNING_REQUIRED = NO;
				COMBINE_HIDPI_IMAGES = YES;
				CURRENT_PROJECT_VERSION = 1;
				DEFINES_MODULE = YES;
				ENABLE_APP_SANDBOX = NO;
				ENABLE_TESTABILITY = YES;
				GENERATE_INFOPLIST_FILE = YES;
				SWIFT_ENABLE_EXPLICIT_MODULES = NO;
				INFOPLIST_KEY_CFBundleDisplayName = "SearchBuddy Views";
				INFOPLIST_KEY_LSApplicationCategoryType = "public.app-category.productivity";
				INFOPLIST_KEY_NSHighResolutionCapable = YES;
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/../Frameworks";
				MACOSX_DEPLOYMENT_TARGET = 14.4;
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.searchbuddy.views;
				PRODUCT_NAME = SearchBuddyViews;
				SDKROOT = macosx;
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
			}};
			name = Release;
		}};""",
    f"""\t\t{ids['test_debug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				BUNDLE_LOADER = "$(TEST_HOST)";
				CODE_SIGN_IDENTITY = "-";
				CODE_SIGNING_REQUIRED = NO;
				GENERATE_INFOPLIST_FILE = YES;
				MACOSX_DEPLOYMENT_TARGET = 14.4;
				SWIFT_ENABLE_EXPLICIT_MODULES = NO;
				PRODUCT_BUNDLE_IDENTIFIER = com.searchbuddy.views.tests;
				PRODUCT_NAME = SearchBuddyViewsTests;
				SDKROOT = macosx;
				SWIFT_VERSION = 5.0;
				TEST_HOST = "$(BUILT_PRODUCTS_DIR)/SearchBuddyViews.app/Contents/MacOS/SearchBuddyViews";
			}};
			name = Debug;
		}};""",
    f"""\t\t{ids['test_release']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{
				BUNDLE_LOADER = "$(TEST_HOST)";
				CODE_SIGN_IDENTITY = "-";
				CODE_SIGNING_REQUIRED = NO;
				GENERATE_INFOPLIST_FILE = YES;
				MACOSX_DEPLOYMENT_TARGET = 14.4;
				SWIFT_ENABLE_EXPLICIT_MODULES = NO;
				PRODUCT_BUNDLE_IDENTIFIER = com.searchbuddy.views.tests;
				PRODUCT_NAME = SearchBuddyViewsTests;
				SDKROOT = macosx;
				SWIFT_VERSION = 5.0;
				TEST_HOST = "$(BUILT_PRODUCTS_DIR)/SearchBuddyViews.app/Contents/MacOS/SearchBuddyViews";
			}};
			name = Release;
		}};""",
    f"""\t\t{ids['app_build_config_list']} /* Build configuration list for PBXNativeTarget "SearchBuddyViews" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{ids['app_debug']} /* Debug */,
				{ids['app_release']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};""",
    f"""\t\t{ids['test_build_config_list']} /* Build configuration list for PBXNativeTarget "SearchBuddyViewsTests" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{ids['test_debug']} /* Debug */,
				{ids['test_release']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};""",
    f"""\t\t{ids['project_build_config_list']} /* Build configuration list for PBXProject "SearchBuddyViews" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{ids['proj_debug']} /* Debug */,
				{ids['proj_release']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};""",
    f"""\t\t{ids['test_proxy']} /* PBXContainerItemProxy */ = {{
			isa = PBXContainerItemProxy;
			containerPortal = {ids['project']} /* Project object */;
			proxyType = 1;
			remoteGlobalIDString = {ids['app_target']};
			remoteInfo = SearchBuddyViews;
		}};""",
    f"""\t\t{ids['test_dep']} /* PBXTargetDependency */ = {{
			isa = PBXTargetDependency;
			target = {ids['app_target']} /* SearchBuddyViews */;
			targetProxy = {ids['test_proxy']} /* PBXContainerItemProxy */;
		}};""",
    f"""\t\t{ids['app_target']} /* SearchBuddyViews */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {ids['app_build_config_list']};
			buildPhases = (
				{ids['app_sources']} /* Sources */,
				{ids['app_resources']} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = SearchBuddyViews;
			productName = SearchBuddyViews;
			productReference = {ids['app_product']} /* SearchBuddyViews.app */;
			productType = "com.apple.product-type.application";
		}};""",
    f"""\t\t{ids['test_target']} /* SearchBuddyViewsTests */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {ids['test_build_config_list']};
			buildPhases = (
				{ids['test_sources']} /* Sources */,
			);
			buildRules = (
			);
			dependencies = (
				{ids['test_dep']} /* PBXTargetDependency */,
			);
			name = SearchBuddyViewsTests;
			productName = SearchBuddyViewsTests;
			productReference = {ids['test_product']} /* SearchBuddyViewsTests.xctest */;
			productType = "com.apple.product-type.bundle.unit-test";
		}};""",
    f"""\t\t{ids['project']} /* Project object */ = {{
			isa = PBXProject;
			attributes = {{
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 2600;
				LastUpgradeCheck = 2600;
			}};
			buildConfigurationList = {ids['project_build_config_list']};
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = {ids['group_root']};
			productRefGroup = {ids['group_products']};
			projectDirPath = "";
			projectRoot = "";
			targets = (
				{ids['app_target']} /* SearchBuddyViews */,
				{ids['test_target']} /* SearchBuddyViewsTests */,
			);
		}};""",
]

pbx = """// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {
%s
	};
	rootObject = %s /* Project object */;
}
""" % ("\n".join(objects), ids["project"])

(PROJ / "project.pbxproj").write_text(pbx)

scheme = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.7">
   <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">
            <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ids['app_target']}" BuildableName="SearchBuddyViews.app" BlueprintName="SearchBuddyViews" ReferencedContainer="container:SearchBuddyViews.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES">
      <Testables>
         <TestableReference skipped="NO">
            <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ids['test_target']}" BuildableName="SearchBuddyViewsTests.xctest" BlueprintName="SearchBuddyViewsTests" ReferencedContainer="container:SearchBuddyViews.xcodeproj">
            </BuildableReference>
         </TestableReference>
      </Testables>
   </TestAction>
   <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES">
      <BuildableProductRunnable runnableDebuggingMode="0">
         <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ids['app_target']}" BuildableName="SearchBuddyViews.app" BlueprintName="SearchBuddyViews" ReferencedContainer="container:SearchBuddyViews.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES">
      <BuildableProductRunnable runnableDebuggingMode="0">
         <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ids['app_target']}" BuildableName="SearchBuddyViews.app" BlueprintName="SearchBuddyViews" ReferencedContainer="container:SearchBuddyViews.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction buildConfiguration="Debug">
   </AnalyzeAction>
   <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES">
   </ArchiveAction>
</Scheme>
"""
(SHARED / "SearchBuddyViews.xcscheme").write_text(scheme)
print(f"Wrote {PROJ}")
