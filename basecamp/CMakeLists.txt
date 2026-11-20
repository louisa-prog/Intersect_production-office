cmake_minimum_required(VERSION 3.14)
project(ProductionOfficePlugin LANGUAGES CXX)

if(DEFINED ENV{LOGOS_MODULE_BUILDER_ROOT})
    include($ENV{LOGOS_MODULE_BUILDER_ROOT}/cmake/LogosModule.cmake)
else()
    message(FATAL_ERROR "LogosModule.cmake not found. Set LOGOS_MODULE_BUILDER_ROOT.")
endif()

# Derive the module name from metadata.json — single source of truth.
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/metadata.json" METADATA_JSON)
string(JSON MODULE_NAME GET ${METADATA_JSON} name)

# Universal UI module: the .rep view contract + the ProductionOfficeBackend
# class. REP_FILE runs repc; the generated *Plugin glue is compiled automatically.
logos_module(
    NAME ${MODULE_NAME}
    REP_FILE src/production_office.rep
    SOURCES
        src/production_office_backend.h
        src/production_office_backend.cpp
        src/production_office_archive.cpp
    INCLUDE_DIRS
        src
)
