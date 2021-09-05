/*
Files.js - ESP3D WebUI component file

 Copyright (c) 2021 Luc LEBOSSE. All rights reserved.

 This code is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation; either
 version 2.1 of the License, or (at your option) any later version.
 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.
 You should have received a copy of the GNU Lesser General Public
 License along with This code; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

import { Fragment, h } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import { T } from "../Translations";
import { useHttpFn } from "../../hooks";
import { espHttpURL } from "../Helpers";
import { Loading, ButtonImg } from "../Controls";
import { useUiContext } from "../../contexts";
import { showModal, showConfirmationModal, showProgressModal } from "../Modal";
import {
  ChevronDown,
  HardDrive,
  Upload,
  RefreshCcw,
  FolderPlus,
  CornerRightUp,
  Edit3,
} from "preact-feather";
import { files } from "../../targets";
import { Folder, File, Trash2, Play } from "preact-feather";

let currentFS = "";
const currentPath = {};
const filesListCache = {};

/*
 * Local const
 *
 */
const FilesPanel = () => {
  const { panels, uisettings } = useUiContext();
  const id = "filesPanel";
  const [filePath, setFilePath] = useState(currentPath[currentFS]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileSystem, setFileSystem] = useState(currentFS);
  const [filesList, setFilesList] = useState(filesListCache[currentFS]);
  const { createNewRequest, abortRequest } = useHttpFn;
  const { modals, toasts } = useUiContext();
  const fileref = useRef();
  const progressValue = useRef(0);
  const progressValueDisplay = useRef(0);
  const sendURLCmd = (cmd) => {
    createNewRequest(
      espHttpURL(cmd.url, cmd.args).toString(),
      { method: "GET" },
      {
        onSuccess: (result) => {
          filesListCache[currentFS] = files.command(
            currentFS,
            "formatResult",
            result
          );
          setFilesList(filesListCache[currentFS]);
          setIsLoading(false);
        },
        onFail: (error) => {
          console.log(error);
          setIsLoading(false);
          toasts.addToast({ content: error, type: "error" });
        },
      }
    );
  };

  const updateProgress = (value) => {
    progressValue.current.value = value;
    progressValueDisplay.current.innerHTML = value + "%";
  };

  const downloadTitle = T("S108");

  const downloadFile = (element) => {
    console.log("Download ", element.name);
    const cmd = files.command(
      currentFS,
      "download",
      currentPath[currentFS],
      element.name
    );
    showProgressModal({
      modals,
      title: downloadTitle,
      button1: {
        cb: abortRequest,
        text: cancel,
      },
      content: (
        <center>
          <progress ref={progressValue} value="0" max="100" />
          <label style="margin-left:15px" ref={progressValueDisplay}></label>
        </center>
      ),
    });
    createNewRequest(
      espHttpURL(cmd.url, cmd.args).toString(),
      { method: "GET", id: "download" },
      {
        onSuccess: (result) => {
          updateProgress(100);
          console.log(result);
          setTimeout(() => {
            modals.removeModal(modals.getModalIndex("progression"));
          }, 2000);

          const file = new Blob([result], { type: "application/octet-stream" });
          if (window.navigator.msSaveOrOpenBlob)
            // IE10+
            window.navigator.msSaveOrOpenBlob(file, element.name);
          else {
            // Others
            let a = document.createElement("a"),
              url = URL.createObjectURL(file);
            a.href = url;
            a.download = element.name;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 0);
          }
        },
        onFail: (error) => {
          modals.removeModal(modals.getModalIndex("progression"));
          toasts.addToast({ content: error, type: "error" });
        },
        onProgress: (e) => {
          console.log(e);
          updateProgress(e);
        },
      }
    );
  };

  const createDirectory = (name) => {
    console.log("Create ", name);
    const cmd = files.command(
      currentFS,
      "createdir",
      currentPath[currentFS],
      name
    );
    if (cmd.type == "url") {
      sendURLCmd(cmd);
    }
  };

  const deleteCommand = (element) => {
    console.log("Delete ", element.name);
    const cmd = files.command(
      currentFS,
      element.size == -1 ? "deletedir" : "delete",
      currentPath[currentFS],
      element.name
    );
    if (cmd.type == "url") {
      sendURLCmd(cmd);
    }
  };
  const onSelectFS = (e) => {
    currentFS = e.target.value;
    fileref.current.multiple = files.capability(currentFS, "UploadMultiple");
    setFileSystem(currentFS);
    if (!currentPath[currentFS]) {
      currentPath[currentFS] = "/";
    }
    onRefresh(e);
  };

  const ElementClicked = (e, line) => {
    if (line.size == -1) {
      console.log("You clicked folder:", line.name);
      currentPath[currentFS] =
        currentPath[currentFS] +
        (currentPath[currentFS] == "/" ? "" : "/") +
        line.name;
      onRefresh(e);
    } else {
      if (files.capability(fileSystem, "Download")) {
        const content = <li>{line.name}</li>;
        showConfirmationModal({
          modals,
          title: downloadtitle,
          content,
          button1: {
            cb: () => {
              downloadFile(line);
            },
            text: yes,
          },
          button2: { text: cancel },
        });
      }
    }
  };

  const onRefresh = (e) => {
    setIsLoading(true);
    setFilePath(currentPath[currentFS]);
    const cmd = files.command(currentFS, "list", currentPath[currentFS]);
    if (cmd.type == "url") {
      createNewRequest(
        espHttpURL(cmd.url, cmd.args).toString(),
        { method: "GET" },
        {
          onSuccess: (result) => {
            filesListCache[currentFS] = files.command(
              currentFS,
              "formatResult",
              result
            );
            setFilesList(filesListCache[currentFS]);
            setIsLoading(false);
          },
          onFail: (error) => {
            console.log(error);
            setIsLoading(false);
            toasts.addToast({ content: error, type: "error" });
          },
        }
      );
    }
  };

  const downloadtitle = T("S87");
  const deletetitle = T("S26");
  const deleteFileText = T("S100");
  const deleteDirText = T("S101");
  const yes = T("S27");
  const cancel = T("S28");
  const createtxt = T("S106");
  const createdirtitle = T("S104");
  const labelCreateDir = T("S105");

  useEffect(() => {
    //show current FS
  }, []);

  console.log(id);
  return (
    <div className="column col-xs-12 col-sm-12 col-md-6 col-lg-4 col-xl-4 col-3 mb-2">
      <div class="panel mb-2 panel-dashboard">
        <div class="navbar">
          <span class="navbar-section  feather-icon-container">
            <HardDrive />
            <strong class="text-ellipsis">{T("S65")}</strong>
          </span>

          <span class="navbar-section">
            <span style="height: 100%;">
              {fileSystem != "" && !isLoading && (
                <div class="dropdown dropdown-right">
                  <span
                    class="dropdown-toggle btn btn-xs btn-header m-1"
                    tabindex="0"
                  >
                    <ChevronDown size="0.8rem" />
                  </span>

                  <ul class="menu">
                    {files.capability(fileSystem, "CreateDir") && (
                      <li class="menu-item">
                        <div
                          class="menu-entry"
                          onclick={(e) => {
                            console.log("Create directory");
                            let name;
                            showModal({
                              modals,
                              title: createdirtitle,
                              button2: { text: cancel },
                              button1: {
                                cb: () => {
                                  if (name.length > 0) createDirectory(name);
                                },
                                text: createtxt,
                              },
                              icon: <Edit3 />,
                              id: "inputName",
                              content: (
                                <Fragment>
                                  <div>{labelCreateDir}</div>
                                  <input
                                    class="form-input"
                                    onInput={(e) => {
                                      name = e.target.value.trim();
                                    }}
                                  />
                                </Fragment>
                              ),
                            });
                          }}
                        >
                          <div class="menu-panel-item">
                            <span class="text-menu-item">{T("S90")}</span>
                            <span class="feather-icon-container">
                              <FolderPlus size="0.8rem" />
                            </span>
                          </div>
                        </div>
                      </li>
                    )}
                    {files.capability(fileSystem, "Upload") && (
                      <li class="menu-item">
                        <div
                          class="menu-entry"
                          onclick={(e) => {
                            console.log("Upload clicked");
                          }}
                        >
                          <div class="menu-panel-item">
                            <span class="text-menu-item">{T("S89")}</span>
                            <span class="feather-icon-container">
                              <Upload size="0.8rem" />
                            </span>
                          </div>
                        </div>
                      </li>
                    )}
                    {(files.capability(fileSystem, "Upload") ||
                      files.capability(fileSystem, "CreateDir")) && (
                      <li class="divider" />
                    )}
                    <li class="menu-item">
                      <div class="menu-entry" onclick={onRefresh}>
                        <div class="menu-panel-item">
                          <span class="text-menu-item">{T("S50")}</span>
                          <span class="feather-icon-container">
                            <RefreshCcw size="0.8rem" />
                          </span>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              )}
              <span
                class="btn btn-clear btn-close m-1"
                aria-label="Close"
                onclick={(e) => {
                  panels.hide(id);
                }}
              />
            </span>
          </span>
        </div>
        <div class="input-group m-2">
          <span>
            <select class="form-select" onchange={onSelectFS} value={currentFS}>
              {files.supported.map((element) => {
                if (uisettings.getValue(element.depend))
                  return (
                    <option value={element.value}>{T(element.name)}</option>
                  );
              })}
            </select>
          </span>
          <span class="form-control m-1">{filePath ? filePath : ""}</span>
        </div>
        <div class="panel-body panel-body-dashboard files-list m-2">
          <input type="file" ref={fileref} class="d-none" />
          {isLoading && fileSystem != "" && <Loading />}

          {!isLoading && fileSystem != "" && filesList && (
            <Fragment>
              {currentPath[currentFS] != "/" && (
                <div
                  class="file-line file-line-name"
                  onclick={(e) => {
                    console.log("Up ");
                    const newpath = currentPath[currentFS].substring(
                      0,
                      currentPath[currentFS].lastIndexOf("/")
                    );

                    currentPath[currentFS] =
                      newpath.length == 0 ? "/" : newpath;
                    onRefresh(e);
                  }}
                >
                  <div
                    class="form-control  file-line-name"
                    style="height:2rem!important"
                  >
                    <CornerRightUp /> <label class="p-2">...</label>
                  </div>
                </div>
              )}
              {filesList.files.map((line) => {
                return (
                  <div class="file-line">
                    <div
                      class={`feather-icon-container ${
                        files.capability(fileSystem, "Download") ||
                        line.size == -1
                          ? "file-line-name"
                          : ""
                      }`}
                      onclick={(e) => {
                        ElementClicked(e, line);
                      }}
                    >
                      {line.size == -1 ? <Folder /> : <File />}
                      <label>{line.name}</label>
                    </div>
                    <div class="file-line-controls">
                      {line.size != -1 && (
                        <Fragment>
                          <span>{line.size}</span>
                          {files.capability(
                            currentFS,
                            "Process",
                            currentPath[currentFS],
                            line.name
                          ) && (
                            <ButtonImg
                              m1
                              ltooltip
                              data-tooltip={T("S74")}
                              icon={<Play />}
                              onClick={(e) => {
                                e.target.blur();
                              }}
                            />
                          )}
                          {!files.capability(
                            currentFS,
                            "Process",
                            currentPath[currentFS],
                            line.name
                          ) && <div style="width:2rem" />}
                        </Fragment>
                      )}
                      <ButtonImg
                        m1
                        ltooltip
                        data-tooltip={line.size == -1 ? T("S101") : T("S100")}
                        icon={<Trash2 />}
                        onClick={(e) => {
                          e.target.blur();
                          const content = (
                            <Fragment>
                              <div>
                                {line.size == -1
                                  ? deleteDirText
                                  : deleteFileText}
                                :
                              </div>
                              <center>
                                <li>{line.name}</li>
                              </center>
                            </Fragment>
                          );
                          showConfirmationModal({
                            modals,
                            title: deletetitle,
                            content,
                            button1: {
                              cb: () => {
                                deleteCommand(line);
                              },
                              text: yes,
                            },
                            button2: { text: cancel },
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </Fragment>
          )}
        </div>
        <div class="panel-footer files-list-footer">
          {!isLoading && filesList && filesList.occupation && (
            <div style=" display: flex; align-items:center; flex-wrap: wrap; justify-content: space-between;">
              <div class="flex-pack">
                {T("S98")}:{filesList.total}
              </div>
              <div class="m-1">-</div>
              <div class="flex-pack m-2">
                {T("S99")}:{filesList.used}
              </div>
              <div class="flex-pack hide-low m-1">
                <div class="bar bar-sm" style="width:4rem">
                  <div
                    class="bar-item"
                    role="progressbar"
                    style={`width:${filesList.occupation}%`}
                    aria-valuenow={filesList.occupation}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>

                <span class="m-1">{filesList.occupation}%</span>
              </div>
            </div>
          )}
          {!isLoading && filesList && filesList.status && (
            <div class="file-status">{T(filesList.status)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const FilesPanelElement = {
  id: "filesPanel",
  content: <FilesPanel />,
  name: "S65",
  icon: "HardDrive",
  show: "showfilespanel",
  onstart: "openfilesonstart",
};

export { FilesPanel, FilesPanelElement };